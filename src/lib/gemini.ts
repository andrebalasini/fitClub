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
    availableExercises: { id: string; nome: string }[]
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

    const prompt = `Você é um personal trainer especialista em converter planilhas de treino. 
Eu vou te mostrar uma imagem de uma ficha de treino.
Por favor, analise a imagem e extraia os exercícios. 

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
    "dia": "A"
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
    } catch (error: any) {
        console.error("Erro ao analisar imagem com Gemini:", error);
        throw new Error(error.message || "Não foi possível processar a imagem. Certifique-se que ela é legível e o limite da API não foi atingido.");
    }
}
