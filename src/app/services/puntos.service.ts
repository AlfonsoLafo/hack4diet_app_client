import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastController } from '@ionic/angular';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { getHeaders } from '../utils/headers.utils';

@Injectable({
  providedIn: 'root'
})
export class PuntosService {

  constructor(
    private http: HttpClient,
    private toastController: ToastController
  ) { }

  registrarPuntos(puntosGanados: number, justificacion: string, showToast: boolean = true) {
    const url = `${environment.base_url}/historial-puntos`; // Ajusta según tu backend
    
    return this.http.post(url, { puntosGanados, justificacion }, getHeaders())
      .pipe(
        tap(async (res: any) => {
          if (res.ok) {
            if (res.subioDeNivel) {
              
              // 1. Toast de Subida de Nivel (Prioridad)
              await this.generarToast(
                `Felicidad! Subes al nivel ${res.nivelActual}`,
                'primary', 
                'toast-nivel-gamificacion',
                'trophy' // Un trofeo en lugar de la estrella
              );

            } else if (showToast) {
              
              // 2. Toast normal de ganar puntos
              let texto = justificacion.toLowerCase();
              if (!texto.startsWith('por')) {
                texto = `por ${texto}`;
              }
              
              await this.generarToast(
                `¡Has ganado ${puntosGanados} puntos ${texto}!`,
                'success',
                'toast-puntos-gamificacion',
                'star'
              );
            }          
          }
        })
      );
  }

  private async generarToast(mensaje: string, color: string, cssClass: string, icon: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3500, // Un pelín más de tiempo para que lo lean bien
      position: 'top',
      color: color,
      icon: icon,
      cssClass: cssClass
    });
    
    await toast.present();
  }
}