import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

export const getVendors = async () => {
    const response = await api.get("/vendors");
    return response.data;
};

export const updateVendorStatus = async (id: string, status: string) => {
    const response = await api.put(`/vendors/${id}/status`, { status });
    return response.data;
};

export const getUsers = async () => {
    const response = await api.get("/users");
    return response.data;
};

export const updateUserStatus = async (id: string, status: string) => {
    const response = await api.put(`/users/${id}/status`, { status });
    return response.data;
};

export const getStats = async () => {
    const response = await api.get("/admin/stats");
    return response.data;
};
