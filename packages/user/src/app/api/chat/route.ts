import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { message } = body;

        if (!message) {
            return NextResponse.json(
                { error: "Message is required" },
                { status: 400 }
            );
        }

        // Try to call the Python agent service first
        try {
            const agentResponse = await fetch("http://localhost:8003/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message }),
            });

            if (agentResponse.ok) {
                const data = await agentResponse.json();
                return NextResponse.json({
                    response: data.response || data.final_output,
                    agent: data.agent || "Event Orchestrator",
                });
            }
        } catch (agentError) {
            console.log("Agent service not available, using fallback");
        }

        // Fallback: Use Google Gemini API directly
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) {
            return NextResponse.json(
                { 
                    response: "I'm your AI Event Planner! I received your message about: \"" + message + "\"\n\nCurrently, I'm running in demo mode. To get full AI capabilities, please ensure the agent service is running or configure the Gemini API key.",
                    agent: "Demo Mode"
                }
            );
        }

        // Call Gemini API
        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        {
                            role: "user",
                            parts: [
                                {
                                    text: `You are an AI Event Planner for Pakistan. Help the user plan their event. User message: ${message}`
                                }
                            ]
                        }
                    ]
                }),
            }
        );

        if (!geminiResponse.ok) {
            throw new Error("Gemini API error");
        }

        const geminiData = await geminiResponse.json();
        const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 
            "I apologize, I couldn't generate a response. Please try again.";

        return NextResponse.json({
            response: responseText,
            agent: "Gemini AI",
        });

    } catch (error) {
        console.error("Chat API error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
