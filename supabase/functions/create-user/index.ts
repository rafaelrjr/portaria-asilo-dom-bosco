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

    // Validate role
    const validRoles = ['admin', 'operador', 'visualizador']
    if (!validRoles.includes(role)) {
      throw new Error('Invalid role')
    }

    // Create the user
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome },
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
      username: email.split('@')[0],
      nome,
      email,
      ativo: true,
    })

    if (profileError) {
      console.error('Profile error:', profileError)
      // Don't throw - profile trigger might have already created it
    }

    // Assign role
    const { error: roleError } = await supabaseAdmin.from('user_roles').insert({
      user_id: userData.user.id,
      role,
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
