import { useRef } from 'react';
import { Visit } from '@/types';
import { formatDate, getVisitPurposeLabel } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Printer, X } from 'lucide-react';

interface VisitorLabelProps {
  visit: Visit;
  onClose: () => void;
}

export function VisitorLabel({ visit, onClose }: VisitorLabelProps) {
  const labelRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    const printContent = labelRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
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
              font-size: 7pt;
              color: #666;
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
              padding: 1mm 2mm;
              border-radius: 1mm;
              font-size: 8pt;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Etiqueta de Identificação
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Preview */}
        <div className="flex justify-center p-4">
          <div
            ref={labelRef}
            className="w-[100mm] h-[60mm] border-2 border-foreground rounded-lg p-3 bg-card"
            style={{ minWidth: '100mm', minHeight: '60mm' }}
          >
            <div className="label h-full flex flex-col">
              <div className="header text-center border-b border-foreground pb-2 mb-2">
                <h1 className="text-base font-bold">ASILO DOM BOSCO</h1>
                <p className="text-[8pt] text-muted-foreground">VISITANTE</p>
              </div>
              
              <div className="content flex-1 space-y-1">
                <p className="name text-lg font-bold uppercase">
                  {visit.pessoa?.nome}
                </p>
                <p className="info text-sm">
                  <span>CPF:</span> {visit.pessoa?.cpf}
                </p>
                <p className="info text-sm">
                  <span>Motivo:</span> {getVisitPurposeLabel(visit.proposito)}
                </p>
                {visit.idoso && (
                  <p className="info text-sm">
                    <span>Visitando:</span> {visit.idoso.nome} - Quarto {visit.idoso.quarto}
                  </p>
                )}
              </div>

              <div className="footer flex justify-between items-center border-t border-foreground pt-2 mt-2">
                <div className="text-xs">
                  <p>{formatDate(visit.dataEntrada)}</p>
                  <p>Entrada: {visit.horaEntrada}</p>
                </div>
                <span className="badge bg-foreground text-background px-2 py-1 rounded text-xs font-bold">
                  {visit.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir Etiqueta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
