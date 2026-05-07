import { GoogleGenerativeAI } from "@google/generative-ai";

export interface AnalyzedWorkoutItem {
    exercicio_id: string; // ID from tbExercicios
    series: number;
    repeticoes: number;
    carga: number;
    descanso: number; // in seconds
    dia: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
}

export async function processWorkoutImage(
    base64Data: string,
    mimeType: string,
    availableExercises: { id: string; nome: string }[],
    targetDay?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
): Promise<AnalyzedWorkoutItem[]> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("A chave VITE_GEMINI_API_KEY não está configurada no arquivo .env.local.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Limit list format to save tokens
    const exercisesListText = availableExercises
        .map(ex => `${ex.id}: ${ex.nome}`)
        .join("\n");

    const dayInstruction = targetDay 
        ? `\nATENÇÃO: Extraia APENAS os exercícios referentes ao treino de hoje. IGNORE o dia na imagem e DEFENA o campo "dia" de TODOS os exercícios retornados para EXATAMENTE "${targetDay}".`
        : `\nATENÇÃO: Identifique os diferentes blocos ou dias de treino presentes na imagem e atribua a eles as letras "A", "B", "C", "D" etc., sequencialmente. Mesmo que a imagem não tenha letras explícitas (ex: "Treino 1", "Treino 2"), você DEVE usar as letras maiúsculas "A", "B", "C" para representar esses blocos na ordem em que aparecem.`;

    const prompt = `Você é um personal trainer especialista em converter planilhas de treino. 
Eu vou te mostrar uma imagem de uma ficha de treino.
Por favor, analise a imagem e extraia os exercícios. ${dayInstruction}

Para cada exercício encontrado na imagem, você DEVE buscar a melhor correspondência APENAS dentro da seguinte lista de exercícios disponíveis no banco de dados do sistema, usando o ID exato:
\`\`\`
${exercisesListText}
\`\`\`

A saída deve ser RIGOROSAMENTE um JSON e NADA MAIS. NENHUM texto adicional. O formato deve ser um array:
[
  {
    "exercicio_id": "uuid-aqui",
    "series": 3,
    "repeticoes": 10,
    "carga": 0,
    "descanso": 60,
    "dia": "${targetDay || 'A'}"
  }
]
Seja direto, responda APENAS com o JSON.`;

    const imageParts = [
        {
            inlineData: {
                data: base64Data,
                mimeType
            },
        },
    ];

    try {
        const result = await model.generateContent([prompt, ...imageParts]);
        const responseText = result.response.text();
        
        // Robust JSON extraction using regex to find the [ ... ] block
        const arrayMatch = responseText.match(/\[[\s\S]*\]/);
        if (!arrayMatch) {
            console.error("Resposta Inesperada:", responseText);
            throw new Error("O modelo não retornou um formato JSON válido.");
        }
        
        const cleanJsonString = arrayMatch[0];
        const parsedWorkout: AnalyzedWorkoutItem[] = JSON.parse(cleanJsonString);
        return parsedWorkout;
    } catch (error: unknown) {
        console.error("Erro ao analisar imagem com Gemini:", error);
        throw new Error(error instanceof Error && error.message ? error.message : "Não foi possível processar a imagem. Certifique-se que ela é legível e o limite da API não foi atingido.");
    }
}

export async function processWorkoutText(
    workoutText: string,
    availableExercises: { id: string; nome: string }[],
    targetDay?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
): Promise<AnalyzedWorkoutItem[]> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("A chave VITE_GEMINI_API_KEY não está configurada no arquivo .env.local.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Limit list format to save tokens
    const exercisesListText = availableExercises
        .map(ex => `${ex.id}: ${ex.nome}`)
        .join("\n");

    const dayInstruction = targetDay 
        ? `\nATENÇÃO: Extraia APENAS os exercícios referentes ao treino de hoje. IGNORE o dia no texto e DEFENA o campo "dia" de TODOS os exercícios retornados para EXATAMENTE "${targetDay}".`
        : `\nATENÇÃO: Identifique os diferentes blocos ou dias de treino presentes no texto e atribua a eles as letras "A", "B", "C", "D" etc., sequencialmente. Mesmo que o texto não tenha letras explícitas (ex: "Treino 1", "Treino 2"), você DEVE usar as letras maiúsculas "A", "B", "C" para representar esses blocos na ordem em que aparecem.`;

    const prompt = `Você é um personal trainer especialista em converter planilhas de treino. 
Eu vou te mostrar um texto descrevendo uma ficha de treino.
Por favor, analise o texto e extraia os exercícios. ${dayInstruction}

Para cada exercício encontrado no texto, você DEVE buscar a melhor correspondência APENAS dentro da seguinte lista de exercícios disponíveis no banco de dados do sistema, usando o ID exato:
\`\`\`
${exercisesListText}
\`\`\`

A saída deve ser RIGOROSAMENTE um JSON e NADA MAIS. NENHUM texto adicional. O formato deve ser um array:
[
  {
    "exercicio_id": "uuid-aqui",
    "series": 3,
    "repeticoes": 10,
    "carga": 0,
    "descanso": 60,
    "dia": "${targetDay || 'A'}"
  }
]
Seja direto, responda APENAS com o JSON.

TEXTO DO TREINO:
${workoutText}
`;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        // Robust JSON extraction using regex to find the [ ... ] block
        const arrayMatch = responseText.match(/\[[\s\S]*\]/);
        if (!arrayMatch) {
            console.error("Resposta Inesperada:", responseText);
            throw new Error("O modelo não retornou um formato JSON válido.");
        }
        
        const cleanJsonString = arrayMatch[0];
        const parsedWorkout: AnalyzedWorkoutItem[] = JSON.parse(cleanJsonString);
        return parsedWorkout;
    } catch (error: unknown) {
        console.error("Erro ao analisar texto com Gemini:", error);
        throw new Error(error instanceof Error && error.message ? error.message : "Não foi possível processar o texto.");
    }
}
