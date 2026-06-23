export interface MisionBase {
  uid?: string;
  descripcion: string;
  puntosMin: number;
  puntosMax: number;
}

export class Mision {
  constructor(
    public uid: string,
    public idUsuario: string,
    public fecha: Date | string,            // Puede llegar como string y convertirse a Date
    public idMision: string | MisionBase,   // Soportará tanto el ID limpio como el objeto poblado con .populate()
    public estado: 'PENDIENTE' | 'COMPLETADA' | 'FALLIDA',
    public puntosOtorgados: number = 0
  ){}

   // Método helper para saber si la misión viene con los detalles.
  isPopulated(): boolean {
    return typeof this.idMision !== 'string';
  }
}