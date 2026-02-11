import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Vendor API
export const getVendors = async (params?: { category?: string; search?: string }) => {
    const response = await api.get("/vendors", { params });
    return response.data;
};

export const getVendorById = async (id: string) => {
    const response = await api.get(`/vendors/${id}`);
    return response.data;
};

export const getVendorServices = async (vendorId: string) => {
    const response = await api.get(`/vendors/${vendorId}/services`);
    return response.data;
};

// Event API
export const createEvent = async (data: {
    eventType: string;
    eventName?: string;
    eventDate: string;
    location?: string;
    attendees?: number;
    budget?: number;
    preferences?: string[];
}) => {
    const response = await api.post("/events", data);
    return response.data;
};

export const getUserEvents = async () => {
    const response = await api.get("/events");
    return response.data;
};

export const getEventById = async (id: string) => {
    const response = await api.get(`/events/${id}`);
    return response.data;
};

// AI Agent API
export const planEventWithAI = async (message: string) => {
    const response = await api.post("/ai/plan", { message });
    return response.data;
};

export const discoverVendorsWithAI = async (query: string, location: string) => {
    const response = await api.post("/ai/discover", { query, location });
    return response.data;
};

// Booking API
export const createBooking = async (data: {
    vendorId: string;
    serviceId: string;
    eventDate: string;
    guestCount?: number;
    notes?: string;
}) => {
    const response = await api.post("/bookings", data);
    return response.data;
};

export const getUserBookings = async () => {
    const response = await api.get("/bookings");
    return response.data;
};
