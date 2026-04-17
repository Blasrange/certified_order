import * as React from "react";
import { promises as fs } from "fs";
import path from "path";
import {
  BookOpen,
  FileText,
  Sparkles,
  ShieldCheck,
  Workflow,
  Database,
  Boxes,
  ClipboardList,
  LifeBuoy,
  ArrowUpRight,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getSectionIcon(title: string) {
  const normalized = title.toLowerCase();

  if (normalized.includes("flujo") || normalized.includes("navegacion")) {
    return Workflow;
  }

  if (normalized.includes("ingreso") || normalized.includes("login")) {
    return ShieldCheck;
  }

  if (normalized.includes("modulos administrativos") || normalized.includes("datos")) {
    return Database;
  }

  if (normalized.includes("modulos operativos") || normalized.includes("pedidos")) {
    return Boxes;
  }

  if (normalized.includes("resumen") || normalized.includes("alcance")) {
    return ClipboardList;
  }

  return BookOpen;
}

function extractSections(markdown: string) {
  return markdown
    .split(/\r?\n/)
    .filter((line) => line.startsWith("## "))
    .map((line) => {
      const title = line.slice(3).trim();
      return {
        title,
        id: slugify(title),
      };
    });
}

function parseTableRow(line: string) {
  return line
    .split("|")
    .map((cell) => cell.trim())
    .filter((cell, index, array) => !(index === 0 && cell === "") && !(index === array.length - 1 && cell === ""));
}

function renderManual(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let paragraph: string[] = [];
  let bullets: string[] = [];
  let ordered: string[] = [];
  let table: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) {
      return;
    }

    blocks.push(
      <p key={`paragraph-${blocks.length}`} className="text-[15px] leading-8 text-slate-600">
        {paragraph.join(" ")}
      </p>
    );
    paragraph = [];
  };

  const flushBullets = () => {
    if (bullets.length === 0) {
      return;
    }

    blocks.push(
      <ul key={`bullets-${blocks.length}`} className="space-y-2.5 pl-1 text-[15px] leading-8 text-slate-600">
        {bullets.map((item, index) => (
          <li key={`bullet-${index}`} className="flex items-start gap-3">
            <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1d57b7]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
    bullets = [];
  };

  const flushOrdered = () => {
    if (ordered.length === 0) {
      return;
    }

    blocks.push(
      <ol key={`ordered-${blocks.length}`} className="space-y-3 pl-0 text-[15px] leading-8 text-slate-600">
        {ordered.map((item, index) => (
          <li key={`ordered-item-${index}`} className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
              {index + 1}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    );
    ordered = [];
  };

  const flushTable = () => {
    if (table.length < 2) {
      table = [];
      return;
    }

    const header = parseTableRow(table[0]);
    const rows = table.slice(2).map(parseTableRow).filter((row) => row.length > 0);

    blocks.push(
      <div key={`table-${blocks.length}`} className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50/80">
            <tr>
              {header.map((cell, index) => (
                <th key={`head-${index}`} className="px-4 py-3.5 font-semibold text-slate-700">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`cell-${rowIndex}-${cellIndex}`} className="px-4 py-3.5 align-top text-slate-600">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    table = [];
  };

  const flushAll = () => {
    flushParagraph();
    flushBullets();
    flushOrdered();
    flushTable();
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (trimmed === "") {
      flushAll();
      return;
    }

    if (trimmed.startsWith("|")) {
      flushParagraph();
      flushBullets();
      flushOrdered();
      table.push(trimmed);
      return;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      flushBullets();
      flushTable();
      ordered.push(orderedMatch[1]);
      return;
    }

    if (trimmed.startsWith("- ")) {
      flushParagraph();
      flushOrdered();
      flushTable();
      bullets.push(trimmed.slice(2));
      return;
    }

    if (trimmed.startsWith("# ")) {
      flushAll();
      blocks.push(
        <h1 key={`h1-${blocks.length}`} className="text-3xl font-bold tracking-tight text-slate-900">
          {trimmed.slice(2)}
        </h1>
      );
      return;
    }

    if (trimmed.startsWith("## ")) {
      flushAll();
      const title = trimmed.slice(3);
      const Icon = getSectionIcon(title);
      blocks.push(
        <div key={`h2-${blocks.length}`} id={slugify(title)} className="scroll-mt-24 pt-6">
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1d57b7] to-[#153f7a] text-white shadow-md">
              <Icon className="size-5" />
            </span>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
            </div>
          </div>
        </div>
      );
      return;
    }

    if (trimmed.startsWith("### ")) {
      flushAll();
      blocks.push(
        <h3 key={`h3-${blocks.length}`} className="pt-3 text-xl font-semibold text-slate-900">
          {trimmed.slice(4)}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith("#### ")) {
      flushAll();
      blocks.push(
        <h4 key={`h4-${blocks.length}`} className="pt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#1d57b7]">
          {trimmed.slice(5)}
        </h4>
      );
      return;
    }

    flushBullets();
    flushOrdered();
    flushTable();
    paragraph.push(trimmed);
  });

  flushAll();

  return blocks;
}

export default async function ManualPage() {
  const manualPath = path.join(process.cwd(), "MANUAL_WEB.md");
  const manualContent = await fs.readFile(manualPath, "utf8");
  const sections = extractSections(manualContent);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl space-y-6 px-6 py-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(87,142,219,0.28),_transparent_35%),linear-gradient(135deg,#08162f_0%,#11284f_45%,#12335f_100%)] text-white shadow-2xl shadow-slate-200/70">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.05)_32%,transparent_65%)]" />
          <div className="relative px-8 py-8 lg:px-10 lg:py-10">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/85 backdrop-blur-md">
                  <span className="inline-flex size-9 items-center justify-center rounded-full bg-white/15">
                    <BookOpen className="size-4.5" />
                  </span>
                  Centro de ayuda operativa
                </div>

                <div className="max-w-4xl space-y-4">
                  <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white lg:text-5xl xl:text-[3.4rem] xl:leading-[1.02]">
                    Manual del sistema con guía operativa y creación de datos
                  </h1>
                  <p className="max-w-2xl text-base leading-7 text-white/72 lg:text-lg">
                    Consulta cómo funciona la plataforma, qué hace cada módulo y cuál es el orden correcto para registrar información desde la web.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-md">
                    <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-white/10">
                      <Workflow className="size-4.5 text-[#9fd0ff]" />
                    </span>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">Cobertura</p>
                      <p className="text-sm font-semibold text-white">Flujos y módulos</p>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-md">
                    <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-white/10">
                      <Database className="size-4.5 text-[#9fd0ff]" />
                    </span>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">Incluye</p>
                      <p className="text-sm font-semibold text-white">Datos maestros</p>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-md">
                    <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-white/10">
                      <FileText className="size-4.5 text-[#9fd0ff]" />
                    </span>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">Fuente</p>
                      <p className="text-sm font-semibold text-white">MANUAL_WEB.md</p>
                    </div>
                  </div>
                </div>

                <div className="max-w-3xl rounded-3xl border border-white/10 bg-white/[0.08] p-5 backdrop-blur-md">
                  <div className="flex items-start gap-4">
                    <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-white/12">
                      <Sparkles className="size-5 text-[#9fd0ff]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Vista profesional para consulta interna</p>
                      <p className="mt-1 text-sm leading-6 text-white/68">
                        El manual se presenta con una estructura más clara, mejor lectura y accesos directos a las secciones principales para que la consulta sea más rápida.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.08] p-5 backdrop-blur-md xl:mt-2">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-white/12">
                    <LifeBuoy className="size-5 text-[#9fd0ff]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Acceso rápido</p>
                    <p className="text-xs text-white/60">Navegación directa por secciones</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2.5">
                  {sections.slice(0, 5).map((section, index) => {
                    const Icon = getSectionIcon(section.title);

                    return (
                      <a
                        key={section.id}
                        href={`#${section.id}`}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white/82 transition-all duration-200 hover:bg-white/[0.12] hover:text-white"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="inline-flex size-7 items-center justify-center rounded-full bg-white/12 text-[11px] font-semibold text-white/80">
                            {index + 1}
                          </span>
                          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#9fd0ff]">
                            <Icon className="size-4" />
                          </span>
                          <span className="truncate">{section.title}</span>
                        </span>
                        <ArrowUpRight className="size-4 shrink-0 text-white/60" />
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_290px]">
          <section className="rounded-[2rem] border border-slate-200 bg-white/95 shadow-lg shadow-slate-200/60 backdrop-blur-sm">
            <article className="space-y-5 px-8 py-8 lg:px-10 lg:py-10">
              {renderManual(manualContent)}
            </article>
          </section>

          <aside className="hidden xl:block">
            <div className="sticky top-24 rounded-[2rem] border border-slate-200 bg-white/95 p-5 shadow-lg shadow-slate-200/50 backdrop-blur-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1d57b7] to-[#153f7a] text-white shadow-md">
                  <BookOpen className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Índice del manual</p>
                  <p className="text-xs text-slate-500">Secciones principales</p>
                </div>
              </div>

              <nav className="mt-4 space-y-2">
                {sections.map((section) => {
                  const Icon = getSectionIcon(section.title);

                  return (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-slate-600 transition-all duration-200 hover:bg-slate-50 hover:text-slate-900"
                    >
                      <span className="inline-flex size-9 items-center justify-center rounded-2xl bg-slate-100 text-[#1d57b7]">
                        <Icon className="size-4" />
                      </span>
                      <span className="leading-5">{section.title}</span>
                    </a>
                  );
                })}
              </nav>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}