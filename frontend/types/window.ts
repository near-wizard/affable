export interface WindowData {
    id: string
    type: string
    title: string
    zIndex: number
    position: { x: number; y: number }
  }
  
  export type WindowType = "about" | "features" | "pricing" | "get-started" | null