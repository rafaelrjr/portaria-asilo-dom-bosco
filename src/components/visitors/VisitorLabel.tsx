import { Visit } from '@/types';
import { formatDate, getVisitPurposeLabel } from '@/lib/utils';
import { getInstitutionSettings } from '@/lib/supabaseDb';

// Function to print label directly without dialog
export async function printVisitorLabelDirect(visit: Visit): Promise<void> {
  const settings = await getInstitutionSettings();
  const institutionName = settings?.nome || 'ASILO DOM BOSCO';

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error('Could not open print window');
    return;
  }

  const labelHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Etiqueta - ${visit.pessoa?.nome}</title>
        <style>
          @page {
            size: 100mm 60mm;
            margin: 0;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            width: 100mm;
            height: 60mm;
            font-family: 'Arial', sans-serif;
            padding: 4mm;
          }
          .label {
            width: 100%;
            height: 100%;
            border: 1px solid #000;
            border-radius: 2mm;
            padding: 3mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .header {
            text-align: center;
            border-bottom: 1px solid #333;
            padding-bottom: 2mm;
            margin-bottom: 2mm;
          }
          .header h1 {
            font-size: 11pt;
            font-weight: bold;
            margin-bottom: 1mm;
          }
          .header p {
            font-size: 10pt;
            font-weight: bold;
            color: #333;
            letter-spacing: 1px;
          }
          .content {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 1.5mm;
          }
          .name {
            font-size: 14pt;
            font-weight: bold;
            text-transform: uppercase;
          }
          .info {
            font-size: 9pt;
          }
          .info span {
            font-weight: bold;
          }
          .footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px solid #333;
            padding-top: 2mm;
            margin-top: 2mm;
            font-size: 8pt;
          }
          .badge {
            background: #000;
            color: #fff;
            padding: 2mm 3mm;
            border-radius: 1mm;
            font-size: 9pt;
            font-weight: bold;
            text-transform: uppercase;
          }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="header">
            <h1>${institutionName}</h1>
            <p>VISITANTE</p>
          </div>
          
          <div class="content">
            <p class="name">${visit.pessoa?.nome || ''}</p>
            <p class="info"><span>CPF:</span> ${visit.pessoa?.cpf || ''}</p>
            ${visit.proposito === 'idoso_especifico' && visit.idoso 
              ? `<p class="info"><span>Visitando:</span> ${visit.idoso.nome}</p>`
              : visit.proposito === 'reuniao' && visit.pessoaDepartamento 
                ? `<p class="info"><span>Pessoa/Dept:</span> ${visit.pessoaDepartamento}</p>`
                : visit.proposito === 'prestacao_servico' 
                  ? `<p class="info"><span>Destino:</span> Prestação de Serviço</p>`
                  : visit.proposito === 'acao_social' 
                    ? `<p class="info"><span>Destino:</span> Ação Social</p>`
                    : visit.proposito === 'visita_geral' 
                      ? `<p class="info"><span>Destino:</span> Visita Geral</p>`
                      : visit.proposito === 'visita_religiosa' 
                        ? `<p class="info"><span>Destino:</span> Visita Religiosa</p>`
                        : visit.proposito === 'psc' 
                          ? `<p class="info"><span>Destino:</span> Prestação de Serviço Comunitário (PSC)</p>`
                          : visit.proposito === 'voluntariado' 
                            ? `<p class="info"><span>Destino:</span> Voluntariado</p>`
                            : ''}
          </div>

          <div class="footer">
            <div>
              <p>${formatDate(visit.dataEntrada)}</p>
              <p>Entrada: ${visit.horaEntrada}</p>
            </div>
            <span class="badge">DEVOLVER NA SAÍDA</span>
          </div>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(labelHTML);
  printWindow.document.close();
  printWindow.focus();
  
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}
