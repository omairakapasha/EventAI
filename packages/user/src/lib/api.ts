import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Mock data for development
const mockVendors = [
    { id: "1", name: "Grand Hall", category: "Venue", status: "approved", rating: 4.5, image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", price: "$$$" },
    { id: "2", name: "Delicious Catering", category: "Catering", status: "approved", rating: 4.8, image: "https://images.unsplash.com/photo-1555244162-803834f70033?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", price: "$$" },
    { id: "3", name: "Floral Dreams", category: "Florist", status: "approved", rating: 4.2, image: "https://images.unsplash.com/photo-1507290439931-a861b5a38200?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", price: "$$" },
    { id: "4", name: "DJ Beats", category: "Music", status: "approved", rating: 4.9, image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", price: "$$" },
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
