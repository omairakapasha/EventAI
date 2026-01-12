"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { useSocket } from "@/components/socket-provider";

type Message = {
    id: string;
    role: "user" | "assistant";
    content: string;
};

export default function ChatPage() {
    const socket = useSocket();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            role: "assistant",
            content: "Hi! I'm your AI Event Planner. How can I help you organize your event today?",
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

    useEffect(() => {
        if (!socket) return;

        socket.on("message", (data: Message) => {
            setMessages((prev) => [...prev, data]);
            setIsLoading(false);
        });

        return () => {
            socket.off("message");
        };
    }, [socket]);

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

        if (socket && socket.connected) {
            socket.emit("message", userMessage);
        } else {
            // Fallback if socket not connected (mock)
            try {
                await new Promise((resolve) => setTimeout(resolve, 1500));

                const botMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    role: "assistant",
                    content: "I received your message! (Socket disconnected, using fallback)",
                };

                setMessages((prev) => [...prev, botMessage]);
            } catch (error) {
                console.error("Failed to send message", error);
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col bg-white shadow-sm rounded-lg overflow-hidden border">
            <div className="p-4 border-b bg-gray-50 flex items-center">
                <Bot className="h-6 w-6 text-indigo-600 mr-2" />
                <h1 className="text-lg font-semibold text-gray-900">AI Event Assistant</h1>
            </div>

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
                                "flex max-w-[80%] rounded-lg px-4 py-2",
                                message.role === "user"
                                    ? "bg-indigo-600 text-white"
                                    : "bg-gray-100 text-gray-900"
                            )}
                        >
                            <div className="mr-2 mt-1">
                                {message.role === "user" ? (
                                    <User className="h-4 w-4 opacity-70" />
                                ) : (
                                    <Bot className="h-4 w-4 opacity-70" />
                                )}
                            </div>
                            <div className="whitespace-pre-wrap">{message.content}</div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start w-full">
                        <div className="bg-gray-100 rounded-lg px-4 py-2 flex items-center">
                            <Bot className="h-4 w-4 mr-2 opacity-70" />
                            <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
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
                        placeholder="Type your message..."
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
    );
}
