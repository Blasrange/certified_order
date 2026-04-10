'use server';
/**
 * @fileOverview Este archivo contiene el flujo de Genkit para mejorar las explicaciones de errores de Excel.
 *
 * - enhanceExcelErrorExplanation - Una función que toma errores de Excel y proporciona una explicación clara con soluciones.
 * - EnhancedExcelErrorExplanationInput - El tipo de entrada para la función enhanceExcelErrorExplanation.
 * - EnhancedExcelErrorExplanationOutput - El tipo de retorno para la función enhanceExcelErrorExplanation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const EnhancedExcelErrorExplanationInputSchema = z.object({
  excelErrors: z
    .string()
    .describe('Un reporte detallado o descripción de los errores encontrados en el archivo Excel.'),
});
export type EnhancedExcelErrorExplanationInput = z.infer<
  typeof EnhancedExcelErrorExplanationInputSchema
>;

const EnhancedExcelErrorExplanationOutputSchema = z.object({
  explanation: z.string().describe('Una explicación clara y concisa de los errores de Excel.'),
  solutions: z
    .array(z.string())
    .describe('Una lista de soluciones sugeridas para resolver los errores de Excel identificados.'),
});
export type EnhancedExcelErrorExplanationOutput = z.infer<
  typeof EnhancedExcelErrorExplanationOutputSchema
>;

export async function enhanceExcelErrorExplanation(
  input: EnhancedExcelErrorExplanationInput
): Promise<EnhancedExcelErrorExplanationOutput> {
  return enhancedExcelErrorExplanationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'enhanceExcelErrorExplanationPrompt',
  input: { schema: EnhancedExcelErrorExplanationInputSchema },
  output: { schema: EnhancedExcelErrorExplanationOutputSchema },
  prompt: `Eres un experto senior en logística y validación de datos. Tu tarea es analizar problemas de estructura en archivos Excel de pedidos y explicarlos de forma MUY AMIGABLE Y PROFESIONAL.

IMPORTANTE: 
- TODA TU RESPUESTA DEBE ESTAR EN ESPAÑOL.
- No uses lenguaje excesivamente técnico; habla como un compañero de soporte ayudando a un usuario.
- Si el error menciona columnas faltantes como 'NIT' o 'Pedido', explica que el sistema necesita esos nombres EXACTOS.

Analiza los siguientes errores de Excel:

Errores: {{{excelErrors}}}

Basado en estos errores, proporciona:
1. Una explicación clara de qué detectó el sistema (ej. "Parece que el archivo no tiene el formato de Virbac").
2. Una lista de soluciones PASO A PASO. Ejemplo: "Revisa que la columna se llame 'Cod_product' y no solo 'Código'".
`,
});

const enhancedExcelErrorExplanationFlow = ai.defineFlow(
  {
    name: 'enhancedExcelErrorExplanationFlow',
    inputSchema: EnhancedExcelErrorExplanationInputSchema,
    outputSchema: EnhancedExcelErrorExplanationOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
