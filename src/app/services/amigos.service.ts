import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { getHeaders } from '../utils/headers.utils';

@Injectable({
  providedIn: 'root'
})
export class AmigosService {

  private baseUrl = `${environment.base_url}/usuarios/amigos`; 

  constructor(private http: HttpClient) { }

  enviarSolicitud(codigoAmigo: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/solicitud`, { codigoAmigo }, getHeaders());
  }

  responderSolicitud(idSolicitante: string, decision: 'ACEPTAR' | 'RECHAZAR'): Observable<any> {
    return this.http.post(`${this.baseUrl}/responder-solicitud`, { idSolicitante, decision }, getHeaders());
  }

  getLeaderboard(miCodigo: string): Observable<any> {
    const params = new HttpParams().set('codigo', miCodigo);
    
    return this.http.get(`${this.baseUrl}/`, {
      ...getHeaders(),
      params
    });
  }

  getPerfilPublicoAmigo(codigo: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${codigo}`, getHeaders());
  }

  eliminarAmigo(idAmigo: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${idAmigo}`, getHeaders());
  }
}