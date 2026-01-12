import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Mock data for development when backend is offline
const mockVendors = [
    { id: "1", name: "Grand Hall", category: "Venue", status: "pending", rating: 4.5 },
    { id: "2", name: "Delicious Catering", category: "Catering", status: "approved", rating: 4.8 },
    { id: "3", name: "Floral Dreams", category: "Florist", status: "rejected", rating: 3.2 },
];

export const getVendors = async () => {
    try {
        const response = await api.get("/vendors");
        return response.data;
    } catch (error) {
        console.warn("Backend not reachable, using mock data");
        return mockVendors;
    }
};

export const updateVendorStatus = async (id: string, status: string) => {
    try {
        const response = await api.put(`/vendors/${id}/status`, { status });
        return response.data;
    } catch (error) {
        console.warn("Backend not reachable, mocking update");
        return { ...mockVendors.find(v => v.id === id), status };
    }
};

// Mock users
const mockUsers = [
    { id: "1", name: "Alice Smith", email: "alice@example.com", role: "organizer", status: "active" },
    { id: "2", name: "Bob Jones", email: "bob@example.com", role: "organizer", status: "suspended" },
];

export const getUsers = async () => {
    try {
        const response = await api.get("/users");
        return response.data;
    } catch (error) {
        console.warn("Backend not reachable, using mock data");
        return mockUsers;
    }
};

export const updateUserStatus = async (id: string, status: string) => {
    try {
        const response = await api.put(`/users/${id}/status`, { status });
        return response.data;
    } catch (error) {
        console.warn("Backend not reachable, mocking update");
        return { ...mockUsers.find(u => u.id === id), status };
    }
};
