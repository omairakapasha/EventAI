"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

type Message = {
    id: string;
    role: "user" | "assistant";
    content: string;
    agent?: string;
};

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            role: "assistant",
            content: "🎉 **Welcome to the AI Event Planner!**\n\nI can help you plan events in Pakistan. Just describe your event in natural language.\n\n**Example:** \"I want to plan a wedding for 200 people in Lahore on March 15th with a budget of PKR 500,000\"",
            agent: "Orchestrator",
        },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input,
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: input }),
            });

            if (!response.ok) {
                throw new Error("Failed to get response");
            }

            const data = await response.json();
            
            const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: data.response,
                agent: data.agent || "AI Assistant",
            };

            setMessages((prev) => [...prev, botMessage]);
        } catch (error) {
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: "❌ Sorry, I encountered an error. Please try again.",
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Bot className="h-6 w-6 text-indigo-600" />
                    <h1 className="text-xl font-semibold text-gray-900">AI Event Planner</h1>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Sparkles className="h-4 w-4" />
                    Powered by Gemini
                </div>
            </div>

            <div className="flex-1 rounded-lg overflow-hidden border shadow-sm bg-white flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={cn(
                                "flex w-full",
                                message.role === "user" ? "justify-end" : "justify-start"
                            )}
                        >
                            <div
                                className={cn(
                                    "flex max-w-[80%] rounded-lg px-4 py-3",
                                    message.role === "user"
                                        ? "bg-indigo-600 text-white"
                                        : "bg-gray-100 text-gray-900"
                                )}
                            >
                                <div className="mr-2 mt-1 flex-shrink-0">
                                    {message.role === "user" ? (
                                        <User className="h-4 w-4 opacity-70" />
                                    ) : (
                                        <Bot className="h-4 w-4 opacity-70" />
                                    )}
                                </div>
                                <div className="whitespace-pre-wrap">
                                    {message.content}
                                    {message.agent && message.role === "assistant" && (
                                        <div className="mt-2 text-xs text-gray-500">
                                            — {message.agent}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start w-full">
                            <div className="bg-gray-100 rounded-lg px-4 py-3 flex items-center">
                                <Bot className="h-4 w-4 mr-2 opacity-70" />
                                <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                                <span className="ml-2 text-sm text-gray-500">Thinking...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t bg-gray-50">
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Describe your event planning needs..."
                            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            <Send className="h-4 w-4" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
