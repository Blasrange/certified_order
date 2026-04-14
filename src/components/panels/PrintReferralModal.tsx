"use client";

import React, { useRef, useState, useEffect } from "react";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X, FileText } from "lucide-react";
import type { OrderGroup, Owner, Store } from "@/lib/types";
import { mockStores } from "@/lib/data";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AppLogo } from "@/components/icons";
import { useAuth } from "@/context/auth-context";
import { useFilteredAppData } from "../../hooks/use-filtered-app-data";

interface PrintReferralModalProps {
  order: (OrderGroup & { processName?: string }) | null;
  owner?: Owner | null;
  isOpen: boolean;
  onClose: () => void;
}

const PrintReferralModal: React.FC<PrintReferralModalProps> = ({ order, owner, isOpen, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const { currentUser } = useAuth();
  const appData = useFilteredAppData(currentUser);
  const [storeInfo, setStoreInfo] = useState<Store | null>(null);

  useEffect(() => {
    if (order && isOpen) {
      const allStores: Store[] = appData.stores.length > 0 ? appData.stores : mockStores;
      const found = allStores.find(s => s.code === order.storeCode && s.customerNit === order.nit);
      setStoreInfo(found || null);
    }
  }, [appData.stores, isOpen, order]);

  if (!order) return null;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Remisión de Despacho - ${order.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
            
            * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
            body { 
              margin: 0; 
              padding: 10mm;
              font-family: 'Inter', sans-serif;
              color: #1e293b;
              background: white;
            }
            .print-page { width: 100%; max-width: 800px; margin: 0 auto; background: white; }
            
            /* Header */
            .header-section { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
            .logo-block { display: flex; align-items: center; gap: 12px; }
            .logo-svg { width: 40px; height: 40px; color: #3b82f6; }
            .brand-name { font-size: 24px; font-weight: 900; letter-spacing: -0.05em; color: #0f172a; text-transform: uppercase; }
            .brand-name span { color: #3b82f6; }
            
            .remision-box { background: #1e293b; color: white; padding: 20px 35px; border-radius: 24px; text-align: right; }
            .remision-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.7; margin-bottom: 4px; display: block; }
            .remision-id { font-size: 24px; font-weight: 900; }

            .emisor-data { margin-top: 20px; font-size: 12px; line-height: 1.5; color: #64748b; }
            .emisor-label { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; display: block; }
            .emisor-name { font-size: 15px; font-weight: 800; color: #1e293b; margin-bottom: 2px; }

            .date-block { text-align: right; margin-top: 15px; }
            .date-label { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; display: block; }
            .date-value { font-size: 14px; font-weight: 700; color: #1e293b; }

            /* Blocks */
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
            .card-block { background: #f8fafc; border: 1px solid #f1f5f9; padding: 25px; border-radius: 24px; }
            .card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
            .card-tag { font-size: 9px; font-weight: 800; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.1em; }
            .card-title { font-size: 18px; font-weight: 900; color: #0f172a; margin-bottom: 6px; display: block; }
            .card-text { font-size: 12px; color: #64748b; font-weight: 600; line-height: 1.4; }

            /* Table */
            .table-wrap { width: 100%; border-collapse: collapse; margin-top: 30px; }
            .table-wrap th { text-align: left; padding: 15px 10px; font-size: 11px; font-weight: 900; color: #0f172a; text-transform: uppercase; border-bottom: 2px solid #0f172a; }
            .table-wrap td { padding: 18px 10px; font-size: 12px; font-weight: 700; color: #475569; border-bottom: 1px solid #f1f5f9; }
            .sku-val { color: #3b82f6; font-weight: 800; }
            .qty-val { text-align: center; font-weight: 900; color: #0f172a; }
            
            /* Totals */
            .totals-container { margin-top: 40px; display: flex; justify-content: flex-end; }
            .totals-box { width: 280px; display: flex; flex-direction: column; gap: 12px; }
            .total-item { display: flex; justify-content: space-between; align-items: center; }
            .total-lbl { font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; }
            .total-val { font-size: 20px; font-weight: 900; color: #1e293b; }
            .total-val.blue { color: #3b82f6; }

            /* Footer */
            .signature-section { margin-top: 80px; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; }
            .sign-box { text-align: center; }
            .sign-line { border-top: 1px solid #cbd5e1; margin-bottom: 10px; }
            .sign-label { font-size: 11px; font-weight: 900; color: #0f172a; text-transform: uppercase; display: block; }
            .sign-sub { font-size: 10px; font-weight: 600; color: #94a3b8; }

            .footer-tag { margin-top: 60px; text-align: center; font-size: 9px; font-weight: 700; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.2em; }

            @media print {
              body { padding: 0; }
              .print-page { max-width: 100%; }
            }
          </style>
        </head>
        <body>
          <div class="print-page">
            <div class="header-section">
              <div>
                <div class="logo-block">
                  <div class="brand-name">Certificador <span>Pro</span></div>
                </div>
                <div class="emisor-data">
                  <span class="emisor-label">Emisor Logístico</span>
                  <div class="emisor-name">${owner?.name || 'Logística Integral S.A.S'}</div>
                  <div>NIT: ${owner?.nit || '900.123.456-7'}</div>
                  <div>${owner?.address || 'Calle 100 #15-30'}, ${owner?.city || 'Bogotá'}</div>
                </div>
              </div>
              <div style="text-align: right;">
                <div class="remision-box">
                  <span class="remision-label">Remisión de Despacho</span>
                  <div class="remision-id"># ${order.id}</div>
                </div>
                <div class="date-block">
                  <span class="date-label">Fecha de Emisión</span>
                  <div class="date-value">${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es })}</div>
                </div>
              </div>
            </div>

            <div class="info-grid">
              <div class="card-block">
                <div class="card-header"><span class="card-tag">Cliente Destinatario</span></div>
                <span class="card-title">${order.customerName}</span>
                <div class="card-text">NIT: ${order.nit}</div>
              </div>
              <div class="card-block">
                <div class="card-header"><span class="card-tag">Punto de Entrega</span></div>
                <span class="card-title">${order.storeName}</span>
                <div class="card-text">Código: ${order.storeCode}</div>
                <div class="card-text">Dirección: ${storeInfo?.address || 'Dirección no registrada'}</div>
              </div>
            </div>

            <table class="table-wrap">
              <thead>
                <tr>
                  <th style="width: 15%;">Sku / Código</th>
                  <th style="width: 45%;">Descripción Técnica</th>
                  <th style="width: 15%;">Lote</th>
                  <th style="width: 12%; text-align: center;">Cant.</th>
                  <th style="width: 13%; text-align: center;">Cajas</th>
                </tr>
              </thead>
              <tbody>
                ${order.items.map(item => `
                  <tr>
                    <td class="sku-val">${item.productCode}</td>
                    <td style="text-transform: uppercase;">${item.description}</td>
                    <td style="font-family: monospace; color: #94a3b8;">${item.batch || 'N/A'}</td>
                    <td class="qty-val">${item.verifiedQuantity}</td>
                    <td class="qty-val">${Math.floor(item.verifiedQuantity / (item.boxFactor || 1))}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="totals-container">
              <div class="totals-box">
                <div class="total-item">
                  <span class="total-lbl">Total Unidades</span>
                  <span class="total-val">${order.items.reduce((acc, i) => acc + (i.verifiedQuantity || 0), 0)}</span>
                </div>
                <div class="total-item">
                  <span class="total-lbl">Total Bultos / Cajas</span>
                  <span class="total-val blue">${order.totalBoxes}</span>
                </div>
              </div>
            </div>

            <div class="signature-section">
              <div class="sign-box">
                <div class="sign-line"></div>
                <span class="sign-label">Firma Autorizada Despacho</span>
                <span class="sign-sub">Nombre y Cédula</span>
              </div>
              <div class="sign-box">
                <div class="sign-line"></div>
                <span class="sign-label">Recibido por (Cliente)</span>
                <span class="sign-sub">Firma, Sello y Fecha</span>
              </div>
            </div>

            <div class="footer-tag">Documento generado por Certificador - Certificación Trazable</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full h-[90vh] flex flex-col p-0 overflow-hidden border border-slate-100 shadow-2xl rounded-2xl bg-white">
        {/* Header - consistente con otros modales */}
        <DialogHeader className="p-6 pb-3 bg-white border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary">
                <FileText className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-slate-800">Remisión de Despacho</DialogTitle>
                <p className="text-xs text-slate-500">Vista previa del documento oficial</p>
              </div>
            </div>
            <Button 
              onClick={handlePrint} 
              className="rounded-xl bg-gradient-to-r from-[#1d57b7] to-[#1a4a9e] text-white font-semibold text-sm px-6 h-10 shadow-md shadow-primary/20 gap-2 hover:scale-[1.02] transition-all duration-200"
            >
              <Printer className="size-4" /> Generar documento
            </Button>
          </div>
        </DialogHeader>

        {/* Contenido del documento */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 flex justify-center">
          <div 
            ref={printRef} 
            className="bg-white shadow-xl rounded-xl w-[800px] min-h-[1050px] p-8 flex flex-col font-sans text-slate-800"
          >
            {/* Header del documento */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <AppLogo className="size-8 text-primary" />
                  <span className="text-xl font-bold tracking-tight uppercase text-slate-800">Certificador <span className="text-primary">Pro</span></span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Emisor Logístico</span>
                  <div className="text-sm font-bold text-slate-800">{owner?.name || 'Logística Integral S.A.S'}</div>
                  <div className="text-[11px] font-medium text-slate-500">NIT: {owner?.nit || '900.123.456-7'}</div>
                  <div className="text-[11px] font-medium text-slate-500">{owner?.address || 'Calle 100 #15-30'}, {owner?.city || 'Bogotá'}</div>
                </div>
              </div>

              <div className="text-right">
                <div className="bg-slate-800 text-white px-6 py-4 rounded-xl shadow-md">
                  <span className="text-[8px] font-bold uppercase tracking-wider opacity-70 block mb-0.5">Remisión de Despacho</span>
                  <div className="text-2xl font-bold tracking-tight"># {order.id}</div>
                </div>
                <div className="mt-3">
                  <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block">Fecha de Emisión</span>
                  <div className="text-xs font-bold text-slate-700">{today}</div>
                </div>
              </div>
            </div>

            {/* Info de cliente y tienda */}
            <div className="grid grid-cols-2 gap-5 mb-8">
              <div className="bg-slate-50 border border-slate-100 p-5 rounded-xl">
                <span className="text-[9px] font-bold text-primary uppercase tracking-wider block mb-2">Cliente Destinatario</span>
                <div className="text-base font-bold text-slate-800 mb-0.5">{order.customerName}</div>
                <div className="text-[11px] font-medium text-slate-500 uppercase">NIT: {order.nit}</div>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-5 rounded-xl">
                <span className="text-[9px] font-bold text-primary uppercase tracking-wider block mb-2">Punto de Entrega</span>
                <div className="text-base font-bold text-slate-800 mb-0.5">{order.storeName}</div>
                <div className="text-[11px] font-medium text-slate-500">Código: {order.storeCode}</div>
                <div className="text-[11px] font-medium text-slate-500">Dirección: {storeInfo?.address || 'Dirección no registrada'}</div>
              </div>
            </div>

            {/* Tabla de items */}
            <div className="flex-1">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 h-10">
                    <th className="text-left text-[10px] font-bold uppercase tracking-wider px-2 text-slate-500">SKU / Código</th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-wider px-2 text-slate-500">Descripción Técnica</th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-wider px-2 text-slate-500">Lote</th>
                    <th className="text-center text-[10px] font-bold uppercase tracking-wider px-2 text-slate-500">Cant.</th>
                    <th className="text-center text-[10px] font-bold uppercase tracking-wider px-2 text-slate-500">Cajas</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-50 h-12 hover:bg-slate-50/50">
                      <td className="px-2 text-xs font-bold text-primary">{item.productCode}</td>
                      <td className="px-2 text-[11px] font-medium text-slate-600 uppercase">{item.description}</td>
                      <td className="px-2 text-[10px] font-mono font-semibold text-slate-400">{item.batch || 'N/A'}</td>
                      <td className="px-2 text-center text-xs font-bold text-slate-700">{item.verifiedQuantity}</td>
                      <td className="px-2 text-center text-xs font-bold text-slate-700">
                        {Math.floor(item.verifiedQuantity / (item.boxFactor || 1))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totales */}
            <div className="flex justify-end mt-6">
              <div className="w-60 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Total Unidades</span>
                  <span className="text-base font-bold text-slate-800">{order.items.reduce((acc, i) => acc + (i.verifiedQuantity || 0), 0)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Total Bultos / Cajas</span>
                  <span className="text-xl font-bold text-primary">{order.totalBoxes}</span>
                </div>
              </div>
            </div>

            {/* Firmas */}
            <div className="grid grid-cols-2 gap-12 mt-12">
              <div className="text-center">
                <div className="h-px bg-slate-200 w-full mb-2" />
                <span className="text-[10px] font-bold text-slate-700 uppercase block tracking-tight">Firma Autorizada Despacho</span>
                <span className="text-[9px] font-medium text-slate-400">Nombre y Cédula</span>
              </div>
              <div className="text-center">
                <div className="h-px bg-slate-200 w-full mb-2" />
                <span className="text-[10px] font-bold text-slate-700 uppercase block tracking-tight">Recibido por (Cliente)</span>
                <span className="text-[9px] font-medium text-slate-400">Firma, Sello y Fecha</span>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-10 text-center text-[8px] font-semibold text-slate-300 uppercase tracking-wider">
              Documento generado por Certificador - Certificación Trazable
            </div>
          </div>
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

export default PrintReferralModal;