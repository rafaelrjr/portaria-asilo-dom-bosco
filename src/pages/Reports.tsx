import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  getInstitutionSettings,
  getVisits,
  getResidents,
  getVehicleTrips,
  getResidentExits,
} from '@/lib/supabaseDb';
import { 
  exportVisitsReportExcel,
  exportResidentsReportExcel,
  exportVehicleTripsReportExcel,
  exportResidentExitsReportExcel,
} from '@/lib/exportUtils';
import {
  generateVisitsReportPDF,
  generateVehicleTripsReportPDF,
  generateResidentExitsReportPDF,
  generateResidentsReportPDF,
} from '@/lib/pdfUtils';
import { FileText, FileSpreadsheet, Users, Home, Truck, DoorOpen } from 'lucide-react';
import { toast } from 'sonner';

export default function Reports() {
  const [exportingVisits, setExportingVisits] = useState(false);
  const [exportingResidents, setExportingResidents] = useState(false);
  const [exportingTrips, setExportingTrips] = useState(false);
  const [exportingExits, setExportingExits] = useState(false);

  async function handleExportVisitsPDF() {
    setExportingVisits(true);
    try {
      const [visits, settings] = await Promise.all([getVisits(), getInstitutionSettings()]);
      if (visits.length === 0) {
        toast.warning('Nenhuma visita encontrada');
        return;
      }
      generateVisitsReportPDF(visits, settings);
      toast.success('Relatório PDF gerado!');
    } catch (error) {
      toast.error('Erro ao gerar relatório');
    } finally {
      setExportingVisits(false);
    }
  }

  async function handleExportVisitsExcel() {
    setExportingVisits(true);
    try {
      const visits = await getVisits();
      if (visits.length === 0) {
        toast.warning('Nenhuma visita encontrada');
        return;
      }
      await exportVisitsReportExcel(visits);
      toast.success('Excel gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar Excel');
    } finally {
      setExportingVisits(false);
    }
  }

  async function handleExportResidentsPDF() {
    setExportingResidents(true);
    try {
      const [residents, settings] = await Promise.all([getResidents(), getInstitutionSettings()]);
      if (residents.length === 0) {
        toast.warning('Nenhum idoso encontrado');
        return;
      }
      generateResidentsReportPDF(residents, settings);
      toast.success('Relatório PDF gerado!');
    } catch (error) {
      toast.error('Erro ao gerar relatório');
    } finally {
      setExportingResidents(false);
    }
  }

  async function handleExportResidentsExcel() {
    setExportingResidents(true);
    try {
      const residents = await getResidents();
      if (residents.length === 0) {
        toast.warning('Nenhum idoso encontrado');
        return;
      }
      await exportResidentsReportExcel(residents);
      toast.success('Excel gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar Excel');
    } finally {
      setExportingResidents(false);
    }
  }

  async function handleExportTripsPDF() {
    setExportingTrips(true);
    try {
      const [trips, settings] = await Promise.all([getVehicleTrips(), getInstitutionSettings()]);
      if (trips.length === 0) {
        toast.warning('Nenhuma viagem encontrada');
        return;
      }
      generateVehicleTripsReportPDF(trips, settings);
      toast.success('Relatório PDF gerado!');
    } catch (error) {
      toast.error('Erro ao gerar relatório');
    } finally {
      setExportingTrips(false);
    }
  }

  async function handleExportTripsExcel() {
    setExportingTrips(true);
    try {
      const trips = await getVehicleTrips();
      if (trips.length === 0) {
        toast.warning('Nenhuma viagem encontrada');
        return;
      }
      await exportVehicleTripsReportExcel(trips);
      toast.success('Excel gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar Excel');
    } finally {
      setExportingTrips(false);
    }
  }

  async function handleExportExitsPDF() {
    setExportingExits(true);
    try {
      const [exits, settings] = await Promise.all([getResidentExits(), getInstitutionSettings()]);
      if (exits.length === 0) {
        toast.warning('Nenhuma saída encontrada');
        return;
      }
      generateResidentExitsReportPDF(exits, settings);
      toast.success('Relatório PDF gerado!');
    } catch (error) {
      toast.error('Erro ao gerar relatório');
    } finally {
      setExportingExits(false);
    }
  }

  async function handleExportExitsExcel() {
    setExportingExits(true);
    try {
      const exits = await getResidentExits();
      if (exits.length === 0) {
        toast.warning('Nenhuma saída encontrada');
        return;
      }
      await exportResidentExitsReportExcel(exits);
      toast.success('Excel gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar Excel');
    } finally {
      setExportingExits(false);
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">Exporte relatórios em PDF ou Excel</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Relatório de Visitas
              </CardTitle>
              <CardDescription>Exporte o histórico de visitas</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button onClick={handleExportVisitsPDF} disabled={exportingVisits} variant="outline" className="flex-1 gap-2">
                <FileText className="h-4 w-4" />
                PDF
              </Button>
              <Button onClick={handleExportVisitsExcel} disabled={exportingVisits} variant="outline" className="flex-1 gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5 text-primary" />
                Cadastro de Idosos
              </CardTitle>
              <CardDescription>Exporte a lista de idosos</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button onClick={handleExportResidentsPDF} disabled={exportingResidents} variant="outline" className="flex-1 gap-2">
                <FileText className="h-4 w-4" />
                PDF
              </Button>
              <Button onClick={handleExportResidentsExcel} disabled={exportingResidents} variant="outline" className="flex-1 gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                Relatório de Veículos
              </CardTitle>
              <CardDescription>Exporte o histórico de viagens</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button onClick={handleExportTripsPDF} disabled={exportingTrips} variant="outline" className="flex-1 gap-2">
                <FileText className="h-4 w-4" />
                PDF
              </Button>
              <Button onClick={handleExportTripsExcel} disabled={exportingTrips} variant="outline" className="flex-1 gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DoorOpen className="h-5 w-5 text-primary" />
                Saídas Temporárias
              </CardTitle>
              <CardDescription>Exporte o histórico de saídas de idosos</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button onClick={handleExportExitsPDF} disabled={exportingExits} variant="outline" className="flex-1 gap-2">
                <FileText className="h-4 w-4" />
                PDF
              </Button>
              <Button onClick={handleExportExitsExcel} disabled={exportingExits} variant="outline" className="flex-1 gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
