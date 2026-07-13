export class Receta {
  constructor(
    public uid: string,
    public idPropietario: string, // ID del usuario creador
    public publico: boolean = true,
    public nombre: string,
    public descripcion: string,
    public ingredientes: string[],
    public pasos: string[],
    public dificultad: 'FACIL' | 'MEDIA' | 'DIFICIL', // Tipado estricto basado en el ENUM
    public tiempoPreparacion: number, // En minutos
    public porciones: number,
    public calorias: number,
    public carbohidratos: number,
    public proteinas: number,
    public grasas: number,
  ){}
}