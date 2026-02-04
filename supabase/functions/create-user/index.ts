import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Verify the requesting user is authenticated and is admin
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !requestingUser) {
      throw new Error('Unauthorized')
    }

    // Check if requesting user is admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .maybeSingle()

    if (roleData?.role !== 'admin') {
      throw new Error('Only admins can create users')
    }

    // Parse request body
    const { nome, email, password, role } = await req.json()

    if (!nome || !email || !password || !role) {
      throw new Error('Missing required fields: nome, email, password, role')
    }

    // Trim whitespace from text fields
    const trimmedNome = String(nome).trim()
    const trimmedEmail = String(email).trim().toLowerCase()
    const trimmedRole = String(role).trim()

    // Validate name length
    if (trimmedNome.length < 3 || trimmedNome.length > 100) {
      throw new Error('Name must be between 3 and 100 characters')
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      throw new Error('Invalid email format')
    }

    // Validate password strength
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters')
    }
    if (!/[A-Z]/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter')
    }
    if (!/[a-z]/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter')
    }
    if (!/[0-9]/.test(password)) {
      throw new Error('Password must contain at least one number')
    }

    // Validate role
    const validRoles = ['admin', 'operador', 'visualizador']
    if (!validRoles.includes(trimmedRole)) {
      throw new Error('Invalid role')
    }

    // Create the user
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: trimmedEmail,
      password,
      email_confirm: true,
      user_metadata: { nome: trimmedNome },
    })

    if (createError) {
      console.error('Create user error:', createError)
      throw new Error(createError.message)
    }

    if (!userData.user) {
      throw new Error('Failed to create user')
    }

    // Create profile
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      user_id: userData.user.id,
      username: trimmedEmail.split('@')[0],
      nome: trimmedNome,
      email: trimmedEmail,
      ativo: true,
    })

    if (profileError) {
      console.error('Profile error:', profileError)
      // Don't throw - profile trigger might have already created it
    }

    // Assign role
    const { error: roleError } = await supabaseAdmin.from('user_roles').insert({
      user_id: userData.user.id,
      role: trimmedRole,
    })

    if (roleError) {
      console.error('Role error:', roleError)
      throw new Error('Failed to assign role')
    }

    return new Response(
      JSON.stringify({ success: true, userId: userData.user.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
