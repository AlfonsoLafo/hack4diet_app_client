export class Usuario {
  constructor(
    public uid: string,
    public nombre?: string,
    public email?: string,
    public password?: string,
    public sexo?: string,
    public altura?: number,
    public edad?: number,
    public pesoInicial?: number,
    public pesoObjetivo?: number,
    public pesoActual?: number,
    public pesoHistorico?: {
      pesoMedio?: number;
      pesoMaximo?: number;
      pesoMinimo?: number;
    },
    public plan?: {
      tipo?: string;
      nivelActividad?: string;
      caloriasDiarias?: number;
      carbosDiarios?: number;
      proteinasDiarias?: number;
      grasasDiarias?: number;
    },
    public distribucionComidas?: string[],
    public configuracion?: {
      tema?: string;
    },
    // ---- NUEVOS CAMPOS AÑADIDOS ----
    public puntos?: number,
    public rachaActual?: number,
    public historialRachas?: {
      fechaInicio: Date | string;
      fechaFin?: Date | string;
    },
    public maximaRacha?: number,
    public insigniasDesbloqueadas?: string[], // Mapeado como array de IDs (strings)
    public insigniasDestacada?: string,       // ID del documento de Insignia
    public avatar?: string,                   // ID del documento de Avatar
    public codigoAmigo?: string,
    public amigos?: string[],                 // Array de IDs de otros Usuarios
    public solicitudesAmistad?: string[],     // Array de IDs de otros Usuarios
    public misionesCompletadas?: string[],    // Array de IDs de Misiones
    public recetasGuardadas?: string[],       // Array de IDs de Recetas
    public opcionesPrivacidad?: {
      currentStreak?: boolean;
      maximumStreak?: boolean;
      level?: boolean; // Incluido ya que venía por defecto en el backend
      points?: boolean;
      badges?: boolean;
    }
  ){}
}