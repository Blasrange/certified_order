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

interface PrintReferralModalProps {
  order: (OrderGroup & { processName?: string }) | null;
  owner?: Owner | null;
  isOpen: boolean;
  onClose: () => void;
}

const PrintReferralModal: React.FC<PrintReferralModalProps> = ({ order, owner, isOpen, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [storeInfo, setStoreInfo] = useState<Store | null>(null);

  useEffect(() => {
    if (order && isOpen) {
      const savedStores = localStorage.getItem('stores');
      const allStores: Store[] = savedStores ? JSON.parse(savedStores) : mockStores;
      const found = allStores.find(s => s.code === order.storeCode && s.customerNit === order.nit);
      setStoreInfo(found || null);
    }
  }, [order, isOpen]);

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
      <DialogContent className="max-w-5xl w-full h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-3xl bg-white rounded-[2.5rem]">
        <DialogHeader className="p-8 pb-4 bg-slate-50 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                <FileText className="size-6" />
              </div>
              <div className="space-y-0.5">
                <DialogTitle className="text-2xl font-black tracking-tighter text-slate-800">Remisión de Despacho</DialogTitle>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vista previa del documento oficial</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={handlePrint} 
                className="rounded-full bg-primary text-white font-black text-xs px-8 h-11 shadow-xl shadow-primary/20 gap-2"
              >
                <Printer className="size-4" /> GENERAR DOCUMENTO
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-12 bg-slate-100/50 flex justify-center">
          <div 
            ref={printRef} 
            className="bg-white shadow-2xl w-[800px] min-h-[1050px] p-16 flex flex-col font-sans text-slate-800"
          >
            <div className="flex justify-between items-start mb-10">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <AppLogo className="size-10 text-primary" />
                  <span className="text-2xl font-black tracking-tighter uppercase text-slate-900">Certificador <span className="text-primary">Pro</span></span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Emisor Logístico</span>
                  <div className="text-base font-black text-slate-800">{owner?.name || 'Logística Integral S.A.S'}</div>
                  <div className="text-xs font-bold text-slate-500">NIT: {owner?.nit || '900.123.456-7'}</div>
                  <div className="text-xs font-bold text-slate-500">{owner?.address || 'Calle 100 #15-30'}, {owner?.city || 'Bogotá'}</div>
                </div>
              </div>

              <div className="text-right">
                <div className="bg-slate-900 text-white px-8 py-5 rounded-[1.5rem] shadow-xl">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60 block mb-1">Remisión de Despacho</span>
                  <div className="text-3xl font-black tracking-tighter"># {order.id}</div>
                </div>
                <div className="mt-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Fecha de Emisión</span>
                  <div className="text-sm font-black text-slate-800">{today}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-10">
              <div className="bg-slate-50 border border-slate-100 p-6 rounded-[1.5rem] shadow-inner">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest block mb-3">Cliente Destinatario</span>
                <div className="text-lg font-black text-slate-800 mb-1">{order.customerName}</div>
                <div className="text-xs font-bold text-slate-500 uppercase">NIT: {order.nit}</div>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-6 rounded-[1.5rem] shadow-inner">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest block mb-3">Punto de Entrega</span>
                <div className="text-lg font-black text-slate-800 mb-1">{order.storeName}</div>
                <div className="text-xs font-bold text-slate-500">Código: {order.storeCode}</div>
                <div className="text-xs font-bold text-slate-500">Dirección: {storeInfo?.address || 'Dirección no registrada'}</div>
              </div>
            </div>

            <div className="flex-1">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-900 h-12">
                    <th className="text-left text-[11px] font-black uppercase tracking-tighter px-2">Sku / Código</th>
                    <th className="text-left text-[11px] font-black uppercase tracking-tighter px-2">Descripción Técnica</th>
                    <th className="text-left text-[11px] font-black uppercase tracking-tighter px-2">Lote</th>
                    <th className="text-center text-[11px] font-black uppercase tracking-tighter px-2">Cant.</th>
                    <th className="text-center text-[11px] font-black uppercase tracking-tighter px-2">Cajas</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100 h-14">
                      <td className="px-2 text-sm font-black text-primary">{item.productCode}</td>
                      <td className="px-2 text-xs font-bold text-slate-700 uppercase">{item.description}</td>
                      <td className="px-2 text-[11px] font-mono font-bold text-slate-400">{item.batch || 'N/A'}</td>
                      <td className="px-2 text-center text-sm font-black text-slate-800">{item.verifiedQuantity}</td>
                      <td className="px-2 text-center text-sm font-black text-slate-800">
                        {Math.floor(item.verifiedQuantity / (item.boxFactor || 1))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-10">
              <div className="w-64 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Unidades</span>
                  <span className="text-lg font-black text-slate-800">{order.items.reduce((acc, i) => acc + (i.verifiedQuantity || 0), 0)}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Bultos / Cajas</span>
                  <span className="text-2xl font-black text-primary">{order.totalBoxes}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-16 mt-20">
              <div className="text-center">
                <div className="h-px bg-slate-300 w-full mb-3" />
                <span className="text-[11px] font-black text-slate-800 uppercase block tracking-tighter">Firma Autorizada Despacho</span>
                <span className="text-[10px] font-bold text-slate-400">Nombre y Cédula</span>
              </div>
              <div className="text-center">
                <div className="h-px bg-slate-300 w-full mb-3" />
                <span className="text-[11px] font-black text-slate-800 uppercase block tracking-tighter">Recibido por (Cliente)</span>
                <span className="text-[10px] font-bold text-slate-400">Firma, Sello y Fecha</span>
              </div>
            </div>

            <div className="mt-16 text-center text-[9px] font-black text-slate-200 uppercase tracking-[0.2em]">
              Documento generado por Certificador - Certificación Trazable
            </div>
          </div>
        </div>

        <DialogFooter className="p-8 bg-slate-50 border-t shrink-0">
          <Button variant="ghost" onClick={onClose} className="rounded-full font-bold h-12 px-8 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 gap-2">
            <X className="size-5" /> CERRAR VISTA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PrintReferralModal;
