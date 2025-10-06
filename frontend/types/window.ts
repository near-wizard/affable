export interface WindowData {
    id: string
    type: string
    title: string
    zIndex: number
    position: { x: number; y: number }
    subroute?: string
  }
  
  export type WindowType = "about" | "features" | "pricing" | "get-started" | null