import { StateGraph, Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { tools, getTeamWorkloadsTool, createTaskTool } from "./tools";
import fs from "fs";
import path from "path";

// State tanımlaması
const AgentState = Annotation.Root({
  messages: Annotation<any[]>({
    reducer: (current, update) => [...current, ...update]
  }),
  teamWorkloads: Annotation<any[]>({
    reducer: (_, update) => update
  }),
  emailContent: Annotation<string>({
    reducer: (_, update) => update
  }),
  taskResult: Annotation<any>({
    reducer: (_, update) => update
  }),
  taskSuggestion: Annotation<any>({
    reducer: (_, update) => update
  }),
  pendingApproval: Annotation<boolean>({
    reducer: (_, update) => update
  }),
  userApproval: Annotation<boolean>({
    reducer: (_, update) => update
  }),
  requesterId: Annotation<string>({
    reducer: (_, update) => update
  })
});

// AI.md promptunu oku
const AI_PROMPT = fs.readFileSync(path.join(process.cwd(), "AI.md"), "utf8");

// OpenAI model
const model = new ChatOpenAI({
  model: "gpt-4o",
  temperature: 0.1
});

const modelWithTools = model.bindTools(tools);

// Ana agent fonksiyonu
async function callModel(state: typeof AgentState.State) {
  const { messages, teamWorkloads, emailContent, pendingApproval, userApproval, taskSuggestion } = state;
  
  // Eğer onay bekleniyorsa ve onay verilmişse task oluştur
  if (pendingApproval && userApproval && taskSuggestion) {
    console.log(`🚀 Task onaylandı, oluşturuluyor: ${taskSuggestion.taskName}`);
    
    // Task creation tool'unu çağır
    try {
      const result = await createTaskTool.invoke({
        taskName: taskSuggestion.taskName,
        taskDescription: taskSuggestion.taskDescription,
        assigneeIdentifier: taskSuggestion.assigneeId,
        assigneeType: "id",
        customerIdentifier: taskSuggestion.customerName || "Unknown Customer",
        customerType: "name",
        createdById: state.requesterId || "system",
        dueDate: taskSuggestion.extractedDueDate,
        useOptimalAssignment: !taskSuggestion.assigneeId
      });
      
      if (result && typeof result === "object" && "success" in result && result.success) {
        console.log(`✅ Task başarıyla oluşturuldu: ${result.message}`);
        return { 
          messages: [new AIMessage(`✅ Task başarıyla oluşturuldu: "${taskSuggestion.taskName}" - ${result.task.assignee?.name || result.task.assignee?.email} kişisine atandı.`)],
          taskResult: result,
          pendingApproval: false
        };
      } else if (result && typeof result === "object" && "error" in result) {
        console.log(`❌ Task oluşturma hatası: ${result.error}`);
        return { 
          messages: [new AIMessage(`❌ Task oluşturma hatası: ${result.error}`)],
          pendingApproval: false
        };
      }
    } catch (error) {
      console.log(`❌ Task oluşturma exception: ${error}`);
      return { 
        messages: [new AIMessage(`❌ Task oluşturma sırasında hata oluştu: ${error}`)],
        pendingApproval: false
      };
    }
  }
  
  // Normal AI analizi
  let enhancedPrompt = AI_PROMPT;
  
  // Add current date context to prompt
  const currentDate = new Date();
  const currentDateStr = currentDate.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const currentDayStr = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
  
  // Replace placeholders in prompt
  enhancedPrompt = enhancedPrompt
    .replace('{{CURRENT_DATE}}', currentDateStr)
    .replace('{{CURRENT_DAY_OF_WEEK}}', currentDayStr);
  
  if (teamWorkloads && teamWorkloads.length > 0) {
    const workloadText = teamWorkloads
      .map((w: any) => {
        const skillsText = w.skills?.length > 0 
          ? ` (Skills: ${w.skills.map((s: any) => `${s.name}(${s.level})`).join(', ')})`
          : '';
        return `- ID: ${w.id}, Name: ${w.name}, Tasks: ${w.openTasks}, Role: ${w.role}${skillsText}`;
      })
      .join("\n");
    
    enhancedPrompt += `\n\n### GÜNCEL TEAM WORKLOAD VE SKİLL BİLGİSİ:\n${workloadText}\n`;
    enhancedPrompt += `\n### ÖNEMLİ: Task ataması yaparken şunları dikkate al:\n`;
    enhancedPrompt += `1. Kullanıcı ID'lerini yukarıdaki listeden seç\n`;
    enhancedPrompt += `2. Task içeriği ile kullanıcının skilleri arasındaki uyumu\n`;
    enhancedPrompt += `3. Mevcut iş yükü dağılımı (açık task sayısı)\n`;
    enhancedPrompt += `4. Task türüne göre gerekli deneyim seviyesi\n`;
    enhancedPrompt += `5. Eğer specific bir kişi istenmediyse, "assigneeId": null vererek optimal atamanın yapılmasını sağla\n\n`;
    enhancedPrompt += `### ONAY MEKANİZMASI:\nTask önerisi yaptıktan sonra SADECE JSON formatında task bilgilerini döndür. Sisteme ekleme işlemi ayrı bir adımda yapılacak.\n`;
  }
  
  const systemMessage = new SystemMessage(enhancedPrompt);
  const allMessages = [systemMessage, ...messages];
  
  const response = await modelWithTools.invoke(allMessages);
  
  // AI response'undan task önerisini çıkarmaya çalış
  try {
    const content = response.content as string;
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
    
    if (jsonMatch) {
      const taskSuggestion = JSON.parse(jsonMatch[1]);
      
      // Console'a öneriyi yazdır
      console.log(`\n📋 AI Task Önerisi:`);
      console.log(`   📝 Task: ${taskSuggestion.taskName}`);
      console.log(`   👤 Önerilen Atama: ${taskSuggestion.assigneeName || taskSuggestion.assigneeId || 'Optimal atama yapılacak'}`);
      console.log(`   🏢 Customer: ${taskSuggestion.customerName || 'Handled externally'}`);
      console.log(`   📄 Açıklama: ${taskSuggestion.taskDescription}`);
      
      // Due date varsa göster
      if (taskSuggestion.extractedDueDate) {
        console.log(`   📅 Due Date: ${taskSuggestion.extractedDueDate}`);
      }
      
      return { 
        messages: [response], 
        taskSuggestion,
        pendingApproval: true
      };
    }
  } catch (e) {
    console.log(`⚠️ Task önerisi parse edilemedi, normal analiz olarak devam ediliyor.`);
  }
  
  return { messages: [response] };
}

// Workload alma fonksiyonu  
async function getWorkloads(state: typeof AgentState.State) {
  try {
    console.log(`📊 Team workload ve skill bilgileri alınıyor...`);
    const result = await getTeamWorkloadsTool.invoke({});
    
    // Console'a workload bilgilerini yazdır
    if (result.teamWorkloads && result.teamWorkloads.length > 0) {
      console.log(`\n📈 Güncel Team Workload & Skills:`);
      result.teamWorkloads.forEach((w: any) => {
        const indicator = w.openTasks === 0 ? "🟢" : w.openTasks < 3 ? "🟡" : "🔴";
        const skillsList = w.skills?.length > 0 
          ? w.skills.map((s: any) => `${s.name}(${s.level})`).slice(0, 3).join(', ')
          : 'No skills';
        
        console.log(`   ${indicator} ${w.name} (${w.role}): ${w.openTasks} açık task`);
        console.log(`      Skills: ${skillsList}${w.skills?.length > 3 ? '...' : ''}`);
      });
    }
    
    return { 
      teamWorkloads: result.teamWorkloads,
      messages: []
    };
  } catch (error) {
    console.error("❌ Workload bilgisi alınamadı:", error);
    return { teamWorkloads: [], messages: [] };
  }
}

// Tool çağrılarını kontrol et
function shouldContinue(state: typeof AgentState.State) {
  const { messages, pendingApproval } = state;
  const lastMessage = messages[messages.length - 1];
  
  // Eğer onay bekliyorsa, dur
  if (pendingApproval) {
    return "__end__";
  }
  
  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    return "tools";
  }
  return "__end__";
}

// Tool node
const toolNode = new ToolNode(tools);

// Task oluşturma sonrası 
async function handleTaskCreation(state: typeof AgentState.State) {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];
  
  // Son tool response'u kontrol et
  if (lastMessage.content && typeof lastMessage.content === "string") {
    try {
      const content = JSON.parse(lastMessage.content);
      if (content.success && content.task) {
        console.log(`✅ Task işleme tamamlandı: ${content.message}`);
        return {
          taskResult: content,
          messages: [new AIMessage(`✅ Task başarıyla oluşturuldu: ${content.message}`)]
        };
      }
    } catch (e) {
      // JSON parse hatası, normal devam et
    }
  }
  
  return { messages: [] };
}

// Graph oluştur
const workflow = new StateGraph(AgentState)
  .addNode("getWorkloads", getWorkloads)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addNode("handleTaskCreation", handleTaskCreation)
  .addEdge("__start__", "getWorkloads")
  .addEdge("getWorkloads", "agent")
  .addConditionalEdges("agent", shouldContinue, {
    tools: "tools",
    __end__: "__end__"
  })
  .addEdge("tools", "handleTaskCreation")
  .addEdge("handleTaskCreation", "agent");

// Compiled graph
export const app = workflow.compile();

// Ana çalıştırma fonksiyonu
export async function processEmail(emailContent: string, userId: string = "default-user") {
  console.log(`\n🤖 Email işleme başlatılıyor...`);
  console.log(`📧 İçerik: ${emailContent.substring(0, 100)}...`);
  
  const initialState = {
    messages: [new HumanMessage(emailContent)],
    teamWorkloads: [],
    emailContent,
    taskResult: null,
    taskSuggestion: null,
    pendingApproval: false,
    userApproval: false,
    requesterId: userId
  };
  
  const result = await app.invoke(initialState);
  return result;
}

// Task onaylama fonksiyonu
export async function approveTask(emailContent: string, userId: string, approved: boolean) {
  console.log(`\n${approved ? '✅' : '❌'} Task ${approved ? 'onaylandı' : 'reddedildi'}`);
  
  // Önceki state'i tekrar al ve onay ile birlikte çalıştır
  const initialState = {
    messages: [new HumanMessage(emailContent)],
    teamWorkloads: [],
    emailContent,
    taskResult: null,
    taskSuggestion: null,
    pendingApproval: true,
    userApproval: approved,
    requesterId: userId
  };
  
  if (approved) {
    // Task onaylandıysa, önce workload al ve AI'dan suggestion al
    const workloadResult = await getWorkloads(initialState);
    const agentResult = await callModel({...initialState, teamWorkloads: workloadResult.teamWorkloads});
    
    if (agentResult.taskSuggestion) {
      // Task suggestion ile birlikte onaylanmış şekilde çalıştır
      const finalResult = await callModel({
        ...initialState,
        teamWorkloads: workloadResult.teamWorkloads,
        taskSuggestion: agentResult.taskSuggestion,
        pendingApproval: true,
        userApproval: true
      });
      
      return finalResult;
    }
  }
  
  return { 
    messages: [new AIMessage(approved ? "Task onaylandı ama işlenemedi." : "Task reddedildi.")],
    taskResult: null 
  };
}

// CopilotKit entegrasyonu için
export async function handleCopilotRequest(message: string, userId: string) {
  try {
    console.log(`\n🎯 CopilotKit request alındı: ${message.substring(0, 50)}...`);
    
    const result = await processEmail(message, userId);
    
    // Eğer task oluşturulduysa JSON döndür
    if (result.taskResult && result.taskResult.success) {
      console.log(`🎉 CopilotKit: Task başarıyla oluşturuldu`);
      return {
        success: true,
        task: result.taskResult.task,
        message: result.taskResult.message
      };
    }
    
    // Eğer onay bekleniyorsa
    if (result.pendingApproval && result.taskSuggestion) {
      console.log(`⏳ CopilotKit: Task önerisi hazır, onay bekleniyor`);
      return {
        success: true,
        pendingApproval: true,
        taskSuggestion: result.taskSuggestion,
        message: "Task önerisi hazırlandı. Onay bekliyor."
      };
    }
    
    // Sadece analiz yapıldıysa AI response döndür
    const lastMessage = result.messages[result.messages.length - 1];
    console.log(`📝 CopilotKit: Analiz tamamlandı`);
    return {
      success: true,
      response: lastMessage.content,
      analysis: "Email analyzed successfully"
    };
  } catch (error) {
    console.error("❌ CopilotKit Agent error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
