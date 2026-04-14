"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, X, Barcode, Download, Layers, BoxSelect, Boxes, Info, AlertCircle } from "lucide-react";
import type { OrderGroup, Store } from "@/lib/types";
import { mockStores } from "@/lib/data";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { useFilteredAppData } from "../../hooks/use-filtered-app-data";

interface PrintTagModalProps {
  order: OrderGroup | null;
  isOpen: boolean;
  onClose: () => void;
}

type DistributionMode = 'real' | 'equitative' | 'full';

interface LabelContent {
  boxNumber: number;
  totalInOrder: number;
  isMixed: boolean;
  items: {
    productCode: string;
    description: string;
    quantity: number;
  }[];
}

const PrintTagModal: React.FC<PrintTagModalProps> = ({ order, isOpen, onClose }) => {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const appData = useFilteredAppData(currentUser);
  const [storeInfo, setStoreInfo] = useState<Store | null>(null);
  const [distMode, setDistMode] = useState<DistributionMode>('real');

  useEffect(() => {
    if (order && isOpen) {
      const allStores: Store[] = appData.stores.length > 0 ? appData.stores : mockStores;
      const found = allStores.find(s => s.code === order.storeCode && s.customerNit === order.nit);
      setStoreInfo(found || null);
      
      if (!order.boxes || order.boxes.length === 0) {
        setDistMode('equitative');
      } else {
        setDistMode('real');
      }
    }
  }, [appData.stores, isOpen, order]);

  const labels = useMemo(() => {
    if (!order) return [];

    const generatedLabels: LabelContent[] = [];
    const today = format(new Date(), 'dd/MM/yyyy');

    if (distMode === 'real' && order.boxes && order.boxes.length > 0) {
      order.boxes.sort((a,b) => a.boxNumber - b.boxNumber).forEach(box => {
        generatedLabels.push({
          boxNumber: box.boxNumber,
          totalInOrder: order.boxes!.length,
          isMixed: box.items.length > 1,
          items: box.items.map(i => ({
            productCode: i.productCode,
            description: i.description || "N/A",
            quantity: i.quantity
          }))
        });
      });
    } else if (distMode === 'equitative') {
      const totalBoxes = Math.max(1, order.totalBoxes || 1);
      for (let i = 1; i <= totalBoxes; i++) {
        generatedLabels.push({
          boxNumber: i,
          totalInOrder: totalBoxes,
          isMixed: false,
          items: order.items.map(item => ({
            productCode: item.productCode,
            description: item.description,
            quantity: Math.floor(item.verifiedQuantity / totalBoxes)
          })).filter(i => i.quantity > 0)
        });
      }
    } else {
      generatedLabels.push({
        boxNumber: 1,
        totalInOrder: 1,
        isMixed: true,
        items: order.items.map(item => ({
          productCode: item.productCode,
          description: item.description,
          quantity: item.verifiedQuantity
        })).filter(i => i.quantity > 0)
      });
    }

    return generatedLabels;
  }, [order, distMode]);

  if (!order) return null;

  const today = format(new Date(), 'dd/MM/yyyy');

  const handleExportZPL = () => {
    let fullZpl = "";
    labels.forEach(lbl => {
      fullZpl += `^XA^PW800^LL640^CI28^CF0,40^FO40,40^FDAlbaran de Salida^FS^CF0,30^FO500,40^FDNOTA DE ENTREGA^FS^CF0,25^FO500,80^FD#${order.id}^FS^FO500,120^FDOrden No.: ${order.orderNumber}^FS^CF0,22^FO40,150^FDCliente: ${order.customerName.substring(0, 30)}^FS^FO500,150^FDFecha: ${today}^FS^FO40,180^FDDireccion: ${(storeInfo?.address || "").substring(0, 40)}^FS^FO500,180^FDCiudad: ${storeInfo?.city || ""}^FS^FO40,210^FDTienda: ${order.storeName.substring(0, 30)}^FS^FO40,240^FDEstado: CERTIFICADO^FS^CF0,26^FO40,280^FDCaja ${lbl.boxNumber} de ${lbl.totalInOrder}${lbl.isMixed ? " (MIXTA)" : ""}^FS^FO40,305^GB720,4,1,B^FS^CF0,20^FO40,315^FDProductos en esta etiqueta:^FS^FO40,340^GB720,25,1,B^FS^FO40,340^GB140,25,1,B^FS^FO180,340^GB380,25,1,B^FS^FO560,340^GB80,25,1,B^FS^FO640,340^GB120,25,1,B^FS`;
      let startY = 365;
      lbl.items.forEach((item, index) => {
        const y = startY + (index * 40);
        fullZpl += `^FO40,${y}^GB720,40,2,B^FS^FO40,${y}^GB140,40,2,B^FS^FO180,${y}^GB380,40,2,B^FS^FO560,${y}^GB80,40,2,B^FS^FO640,${y}^GB120,40,2,B^FS^CF0,16^FO50,${y + 10}^FB120,1,0,L,0^FD${item.productCode}^FS^FO190,${y + 5}^FB360,2,0,L,0^FD${item.description.substring(0, 50)}^FS^FO580,${y + 10}^FB60,1,0,C,0^FD${item.quantity}^FS^FO685,${y + 10}^FB60,1,0,C,0^FDUND^FS`;
      });
      fullZpl += `^XZ\n`;
    });
    const element = document.createElement("a");
    const file = new Blob([fullZpl], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `Etiquetas_ZPL_${order.id}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast({ title: "Archivo ZPL generado", description: `Se exportaron ${labels.length} etiquetas del pedido ${order.id}.` });
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    let labelsHtml = "";
    labels.forEach(lbl => {
      labelsHtml += `<div class="label-page"><div class="z-header"><div class="z-title">Albaran de Salida</div><div class="z-meta"><div class="z-notade">NOTA DE ENTREGA</div><div class="z-id">#${order.id}</div><div class="z-ord">Orden No.: ${order.orderNumber}</div></div></div><div class="z-info-grid"><div class="z-row"><div class="z-col"><span>CLIENTE:</span> <strong>${order.customerName}</strong></div><div class="z-col text-right"><span>FECHA:</span> <strong>${today}</strong></div></div><div class="z-row"><div class="z-col"><span>DIRECCION:</span> <strong>${storeInfo?.address || 'S/N'}</strong></div><div class="z-col text-right"><span>CIUDAD:</span> <strong>${storeInfo?.city || 'S/N'}</strong></div></div><div class="z-row"><div class="z-col"><span>TIENDA:</span> <strong>${order.storeName}</strong></div></div><div class="z-row"><div class="z-col"><span>ESTADO:</span> <strong>CERTIFICADO</strong></div></div></div><div class="z-box-bar"><div class="z-box-count">Caja ${lbl.boxNumber} de ${lbl.totalInOrder}</div><div class="z-status-badge">ESTADO: ${lbl.isMixed ? "CERTIFICADO (MIXTO)" : "CERTIFICADO"}</div></div><div class="z-products-label">Productos en esta etiqueta:</div><div class="z-table"><div class="z-thead"><div class="z-th" style="width: 20%">SKU</div><div class="z-th" style="width: 55%">Descripcion</div><div class="z-th" style="width: 12%">Cant</div><div class="z-th" style="width: 13%">Und</div></div>${lbl.items.map(item => `<div class="z-tr"><div class="z-td" style="width: 20%"><strong>${item.productCode}</strong></div><div class="z-td" style="width: 55%">${item.description.substring(0, 45)}</div><div class="z-td text-center" style="width: 12%"><strong>${item.quantity}</strong></div><div class="z-td text-center" style="width: 13%">UND</div></div>`).join('')}</div></div>`;
    });
    printWindow.document.write(`<html><head><title>Etiquetas - ${order.id}</title><style>@import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');* { box-sizing: border-box; -webkit-print-color-adjust: exact; }body { margin: 0; padding: 0; font-family: 'Courier Prime', monospace; background: white; color: black; }@page { size: 100mm 150mm; margin: 0; }.label-page { width: 100mm; height: 150mm; padding: 8mm; page-break-after: always; position: relative; border: 1px solid transparent; }.z-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5mm; }.z-title { font-size: 18pt; font-weight: bold; text-transform: uppercase; }.z-meta { text-align: right; }.z-notade { font-size: 10pt; font-weight: bold; }.z-id { font-size: 16pt; font-weight: 900; margin-top: 1mm; }.z-ord { font-size: 9pt; font-weight: bold; }.z-info-grid { font-size: 8.5pt; margin-top: 4mm; border-bottom: 1.5mm solid black; padding-bottom: 3mm; }.z-row { display: flex; justify-content: space-between; margin-bottom: 1.5mm; }.z-col span { text-transform: uppercase; margin-right: 2mm; }.text-right { text-align: right; }.z-box-bar { display: flex; justify-content: space-between; align-items: flex-end; padding: 3mm 0; margin-top: 2mm; }.z-box-count { font-size: 22pt; font-weight: 900; }.z-status-badge { font-size: 8pt; font-weight: bold; }.z-products-label { font-size: 9pt; font-weight: bold; margin: 3mm 0; }.z-table { border: 0.6mm solid black; width: 100%; }.z-thead { display: flex; border-bottom: 0.6mm solid black; background: #eee; font-weight: bold; font-size: 8pt; height: 7mm; align-items: center; }.z-tr { display: flex; border-bottom: 0.4mm solid black; font-size: 7.5pt; min-height: 12mm; align-items: center; }.z-tr:last-child { border-bottom: none; }.z-th, .z-td { padding: 0 1.5mm; border-right: 0.4mm solid black; overflow: hidden; }.z-th:last-child, .z-td:last-child { border-right: none; }.text-center { text-align: center; }@media print { body { background: none; } .label-page { border: none; } }</style></head><body>${labelsHtml}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  const sampleLabel = labels[0];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col p-0 overflow-hidden border border-slate-100 shadow-2xl rounded-2xl bg-white">
        {/* Header - consistente con otros modales */}
        <DialogHeader className="p-6 pb-3 bg-white border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 flex items-center justify-center text-amber-600">
                <Barcode className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-slate-800">Etiquetas Logísticas</DialogTitle>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-[9px] font-semibold rounded-full bg-slate-50 text-slate-600 border-slate-200">
                    Bultos detectados: {labels.length}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={handleExportZPL} 
                variant="outline" 
                className="rounded-xl border-amber-200 bg-white text-amber-600 font-semibold text-sm px-5 h-10 shadow-sm gap-2 hover:bg-amber-50"
              >
                <Download className="size-4" /> Exportar ZPL
              </Button>
              <Button 
                onClick={handlePrint} 
                className="rounded-xl bg-gradient-to-r from-[#1d57b7] to-[#1a4a9e] text-white font-semibold text-sm px-6 h-10 shadow-md shadow-primary/20 gap-2 hover:scale-[1.02] transition-all duration-200"
              >
                <Printer className="size-4" /> Generar {labels.length} etiquetas
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Panel de distribución */}
        <div className="bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Origen de datos</p>
            <p className="text-[11px] text-slate-400 font-medium">Selecciona cómo deseas agrupar los bultos</p>
          </div>
          <Tabs value={distMode} onValueChange={(v) => setDistMode(v as any)} className="w-[500px]">
            <TabsList className="grid w-full grid-cols-3 h-11 rounded-xl bg-slate-100 p-1">
              <TabsTrigger 
                value="real" 
                className="rounded-lg font-semibold text-xs uppercase tracking-wider gap-2 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm"
                disabled={!order.boxes || order.boxes.length === 0}
              >
                <BoxSelect className="size-3.5" /> Empaque real
              </TabsTrigger>
              <TabsTrigger 
                value="equitative" 
                className="rounded-lg font-semibold text-xs uppercase tracking-wider gap-2 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm"
              >
                <Layers className="size-3.5" /> Equitativo
              </TabsTrigger>
              <TabsTrigger 
                value="full" 
                className="rounded-lg font-semibold text-xs uppercase tracking-wider gap-2 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm"
              >
                <Boxes className="size-3.5" /> Caja única
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Contenido principal */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 flex flex-col items-center gap-6">
          {(!order.boxes || order.boxes.length === 0) && distMode === 'real' && (
            <div className="bg-white p-8 rounded-xl shadow-sm text-center max-w-md border border-slate-200">
              <AlertCircle className="size-10 text-amber-500 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800 text-base">No hay datos de empaque real</h3>
              <p className="text-xs font-medium text-slate-400 mt-1">Certifica los productos asignándolos a bultos específicos para habilitar este modo.</p>
            </div>
          )}

          {sampleLabel && (
            <div className="flex flex-col items-center gap-4">
              {/* Vista previa de la etiqueta */}
              <div className="bg-white shadow-lg rounded-xl w-[480px] min-h-[650px] p-6 flex flex-col font-mono text-black border-2 border-slate-200 relative select-none">
                <div className="flex justify-between items-start">
                  <span className="text-xl font-bold uppercase leading-tight tracking-tight">Albaran de Salida</span>
                  <div className="text-right">
                    <span className="text-xs font-bold block">NOTA DE ENTREGA</span>
                    <div className="text-lg font-black mt-1">#{order.id}</div>
                    <div className="text-[10px] font-bold">Orden No.: {order.orderNumber}</div>
                  </div>
                </div>

                <div className="space-y-2 mt-6 mb-8 text-[10px] font-bold">
                  <div className="flex justify-between border-b-2 border-slate-300 pb-4 mb-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex"><span className="w-20 uppercase text-slate-500">Cliente:</span><span className="uppercase truncate max-w-[180px]">{order.customerName}</span></div>
                      <div className="flex"><span className="w-20 uppercase text-slate-500">Dirección:</span><span className="uppercase truncate max-w-[180px]">{storeInfo?.address || 'S/N'}</span></div>
                      <div className="flex"><span className="w-20 uppercase text-slate-500">Tienda:</span><span className="uppercase">{order.storeName}</span></div>
                      <div className="flex"><span className="w-20 uppercase text-slate-500">Estado:</span><span className="text-emerald-600 font-bold">CERTIFICADO</span></div>
                    </div>
                    <div className="text-right space-y-1.5">
                      <div className="flex justify-end"><span className="mr-2 text-slate-500">Fecha:</span><span>{today}</span></div>
                      <div className="flex justify-end"><span className="mr-2 text-slate-500">Ciudad:</span><span>{storeInfo?.city || 'S/N'}</span></div>
                    </div>
                  </div>
                </div>

                <div className="mb-3 flex justify-between items-end">
                  <span className="text-2xl font-black leading-none">Caja 1 de {labels.length}</span>
                  <span className="text-[9px] font-bold uppercase text-slate-500">Estado: {sampleLabel.isMixed ? "Certificado (Mixto)" : "Certificado"}</span>
                </div>

                <div className="text-[10px] font-bold mb-2 mt-4">Productos en esta etiqueta:</div>

                <div className="border border-slate-200 rounded-lg flex flex-col overflow-hidden">
                  <div className="flex bg-slate-100 font-bold text-[9px] h-8 items-center border-b border-slate-200">
                    <div className="w-[20%] px-2 border-r border-slate-200 h-full flex items-center justify-center">SKU</div>
                    <div className="w-[55%] px-3 border-r border-slate-200 h-full flex items-center">Descripción</div>
                    <div className="w-[12%] text-center border-r border-slate-200 h-full flex items-center justify-center">Cant</div>
                    <div className="w-[13%] text-center h-full flex items-center justify-center">Und</div>
                  </div>
                  <div className="flex-1">
                    {sampleLabel.items.slice(0, 8).map((item, i) => (
                      <div key={i} className="flex border-b border-slate-100 font-medium text-[9px] h-14 items-center last:border-none">
                        <div className="w-[20%] px-2 border-r border-slate-100 h-full flex items-center justify-center truncate font-bold text-primary">{item.productCode}</div>
                        <div className="w-[55%] px-3 border-r border-slate-100 h-full flex items-center leading-tight"><span className="line-clamp-2 uppercase text-slate-600">{item.description}</span></div>
                        <div className="w-[12%] text-center border-r border-slate-100 h-full flex items-center justify-center text-base font-bold text-slate-800">{item.quantity}</div>
                        <div className="w-[13%] text-center h-full flex items-center justify-center text-[9px] text-slate-500">UND</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-auto pt-6 text-[8px] text-center text-slate-300 font-semibold uppercase tracking-wider">
                  REPRESENTACIÓN DE ETIQUETA ZPL
                </div>
              </div>
              
              {/* Badge de modo */}
              <div className="max-w-[480px] w-full">
                <Badge className="w-full bg-primary/10 text-primary border-primary/20 font-semibold px-4 py-2 rounded-xl flex justify-center shadow-sm text-xs">
                  {distMode === 'real' 
                    ? `Modo operativo: ${labels.length} bultos certificados físicamente` 
                    : distMode === 'equitative' 
                    ? `Reparto uniforme: ${labels.length} etiquetas prorrateadas` 
                    : `Caja única: Todo el pedido en 1 solo bulto`}
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Footer del modal */}
        <DialogFooter className="p-5 bg-white border-t border-slate-100 shrink-0">
          <Button 
            variant="ghost" 
            onClick={onClose} 
            className="dialog-btn-secondary"
          >
            <X className="size-4" /> Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PrintTagModal;