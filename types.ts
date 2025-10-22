// FIX: Added missing type definitions for Location, ChatRole, and ChatMessage
// to resolve compilation errors in hooks/useGeolocation.ts and components/ChatWindow.tsx.

export interface Location {
  latitude: number;
  longitude: number;
}

export enum ChatRole {
  USER = 'user',
  AI = 'ai',
  SYSTEM = 'system',
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  image?: string;
}

export interface WeatherData {
  soilType: string;
  current: {
    temperature: number;
    rainfall: number;
  };
  forecast: {
    maxTemp: number;
    minTemp: number;
    rainfall: number;
  };
}