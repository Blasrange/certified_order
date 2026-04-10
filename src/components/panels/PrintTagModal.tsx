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
  const [storeInfo, setStoreInfo] = useState<Store | null>(null);
  const [distMode, setDistMode] = useState<DistributionMode>('real');

  useEffect(() => {
    if (order && isOpen) {
      const savedStores = localStorage.getItem('stores');
      const allStores: Store[] = savedStores ? JSON.parse(savedStores) : mockStores;
      const found = allStores.find(s => s.code === order.storeCode && s.customerNit === order.nit);
      setStoreInfo(found || null);
      
      // Si no hay datos de bultos grabados, cambiar a equitativo por defecto
      if (!order.boxes || order.boxes.length === 0) {
        setDistMode('equitative');
      } else {
        setDistMode('real');
      }
    }
  }, [order, isOpen]);

  const labels = useMemo(() => {
    if (!order) return [];

    const generatedLabels: LabelContent[] = [];
    const today = format(new Date(), 'dd/MM/yyyy');

    if (distMode === 'real' && order.boxes && order.boxes.length > 0) {
      // USAR DATOS REALES DEL OPERARIO
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
      // CAJA ÚNICA
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
    toast({ title: "ZPL Generado", description: `${labels.length} bultos exportados.` });
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
      <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-3xl bg-white rounded-[2.5rem]">
        <DialogHeader className="p-8 pb-4 bg-slate-50 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 shadow-sm">
                <Barcode className="size-6" />
              </div>
              <div className="space-y-0.5">
                <DialogTitle className="text-2xl font-black tracking-tighter text-slate-800">Etiquetas Logísticas</DialogTitle>
                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-white">
                  Bultos Detectados: {labels.length}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={handleExportZPL} variant="outline" className="rounded-full border-amber-200 bg-white text-amber-600 font-black text-xs px-6 h-11 shadow-sm gap-2">
                <Download className="size-4" /> EXPORTAR ZPL
              </Button>
              <Button onClick={handlePrint} className="rounded-full bg-slate-900 text-white font-black text-xs px-8 h-11 shadow-xl shadow-slate-900/20 gap-2">
                <Printer className="size-4" /> GENERAR {labels.length} ETIQUETAS
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="bg-white px-8 py-4 border-b flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Origen de Datos</span>
            <p className="text-[11px] text-slate-500 font-bold italic">Selecciona cómo deseas agrupar los bultos</p>
          </div>
          <Tabs value={distMode} onValueChange={(v) => setDistMode(v as any)} className="w-[550px]">
            <TabsList className="grid w-full grid-cols-3 h-12 rounded-2xl bg-slate-100 p-1">
              <TabsTrigger value="real" className="rounded-xl font-black text-[10px] uppercase tracking-widest gap-2" disabled={!order.boxes || order.boxes.length === 0}>
                <BoxSelect className="size-3.5" /> Empaque Real
              </TabsTrigger>
              <TabsTrigger value="equitative" className="rounded-xl font-black text-[10px] uppercase tracking-widest gap-2">
                <Layers className="size-3.5" /> Equitativo
              </TabsTrigger>
              <TabsTrigger value="full" className="rounded-xl font-black text-[10px] uppercase tracking-widest gap-2">
                <Boxes className="size-3.5" /> Caja Única
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-y-auto p-12 bg-slate-200/50 flex flex-col items-center gap-10">
          {(!order.boxes || order.boxes.length === 0) && distMode === 'real' && (
            <div className="bg-white p-12 rounded-[2.5rem] shadow-xl text-center max-w-md border-2 border-dashed border-slate-200">
              <AlertCircle className="size-12 text-amber-500 mx-auto mb-4" />
              <h3 className="font-black text-slate-800 text-lg">No hay datos de empaque real</h3>
              <p className="text-sm font-bold text-slate-400 mt-2">Certifica los productos asignándolos a bultos específicos para habilitar este modo.</p>
            </div>
          )}

          {sampleLabel && (
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white shadow-2xl w-[500px] min-h-[700px] p-10 flex flex-col font-mono text-black border-[4px] border-black relative select-none">
                <div className="flex justify-between items-start">
                  <span className="text-2xl font-bold uppercase leading-tight tracking-tighter">Albaran de Salida</span>
                  <div className="text-right">
                    <span className="text-sm font-bold block">NOTA DE ENTREGA</span>
                    <div className="text-2xl font-black mt-2">#${order.id}</div>
                    <div className="text-[11px] font-bold">Orden No.: {order.orderNumber}</div>
                  </div>
                </div>

                <div className="space-y-2 mt-8 mb-10 text-[11px] font-bold">
                  <div className="flex justify-between border-b-[4px] border-black pb-4 mb-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex"><span className="w-24 uppercase">CLIENTE:</span><span className="uppercase truncate max-w-[180px]">{order.customerName}</span></div>
                      <div className="flex"><span className="w-24 uppercase">DIRECCION:</span><span className="uppercase truncate max-w-[180px]">{storeInfo?.address || 'S/N'}</span></div>
                      <div className="flex"><span className="w-24 uppercase">TIENDA:</span><span className="uppercase">{order.storeName}</span></div>
                      <div className="flex"><span className="w-24 uppercase">ESTADO:</span><span>CERTIFICADO</span></div>
                    </div>
                    <div className="text-right space-y-2">
                      <div className="flex justify-end"><span className="mr-2">FECHA:</span><span>{today}</span></div>
                      <div className="flex justify-end"><span className="mr-2">CIUDAD:</span><span>{storeInfo?.city || 'S/N'}</span></div>
                    </div>
                  </div>
                </div>

                <div className="mb-2 flex justify-between items-end">
                  <span className="text-4xl font-black leading-none">Caja 1 de {labels.length}</span>
                  <span className="text-[10px] font-bold uppercase">ESTADO: {sampleLabel.isMixed ? "CERTIFICADO (MIXTO)" : "CERTIFICADO"}</span>
                </div>

                <div className="text-[11px] font-bold mb-3 mt-6">Productos en esta etiqueta:</div>

                <div className="border-[2px] border-black flex flex-col overflow-hidden">
                  <div className="flex border-b-[2px] border-black bg-slate-100 font-bold text-[10px] h-10 items-center">
                    <div className="w-[20%] px-2 border-r-[2px] border-black h-full flex items-center justify-center">SKU</div>
                    <div className="w-[55%] px-3 border-r-[2px] border-black h-full flex items-center">Descripcion</div>
                    <div className="w-[12%] text-center border-r-[2px] border-black h-full flex items-center justify-center">Cant</div>
                    <div className="w-[13%] text-center h-full flex items-center justify-center">Und</div>
                  </div>
                  <div className="flex-1">
                    {sampleLabel.items.slice(0, 8).map((item, i) => (
                      <div key={i} className="flex border-b-[2px] border-black font-bold text-[10px] h-16 items-center last:border-none">
                        <div className="w-[20%] px-2 border-r-[2px] border-black h-full flex items-center justify-center truncate font-black">{item.productCode}</div>
                        <div className="w-[55%] px-3 border-r-[2px] border-black h-full flex items-center leading-tight"><span className="line-clamp-2 uppercase">{item.description}</span></div>
                        <div className="w-[12%] text-center border-r-[2px] border-black h-full flex items-center justify-center text-xl font-black">{item.quantity}</div>
                        <div className="w-[13%] text-center h-full flex items-center justify-center text-[9px]">UND</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-auto pt-10 text-[9px] text-center opacity-30 font-bold uppercase tracking-[0.3em]">REPRESENTACIÓN DE ETIQUETA ZPL</div>
              </div>
              
              <div className="max-w-[500px] w-full">
                <Badge className="w-full bg-primary/10 text-primary border-primary/20 font-black px-6 py-3 rounded-2xl flex justify-center shadow-sm">
                  {distMode === 'real' 
                    ? `Modo Operativo: Se están utilizando los ${labels.length} bultos certificados físicamente.` 
                    : distMode === 'equitative' 
                    ? `Reparto Uniforme: Se generarán ${labels.length} etiquetas prorrateadas.` 
                    : `Caja Única: Se consolidará todo el pedido en 1 solo bulto.`}
                </Badge>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-8 bg-slate-50 border-t shrink-0">
          <Button variant="ghost" onClick={onClose} className="rounded-full font-bold h-12 px-8 bg-white border border-slate-200 text-slate-600 gap-2">
            <X className="size-5" /> CERRAR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PrintTagModal;