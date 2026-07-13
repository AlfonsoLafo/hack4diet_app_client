import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { Receta } from '../models/receta.model';
import { getHeaders } from '../utils/headers.utils';

@Injectable({
  providedIn: 'root'
})
export class RecetasService {

  private baseUrl = `${environment.base_url}/recetas`;

  constructor(private http: HttpClient) { }

  getRecetasUsuario(idUsuario: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/usuario/${idUsuario}`, getHeaders());
  }

  getRecetasGuardadas(idUsuario: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/usuario/${idUsuario}/guardadas`, getHeaders());
  }

  getRecetaPorId(idReceta: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${idReceta}`, getHeaders());
  }

  crearReceta(receta: Receta): Observable<any> {
    return this.http.post(this.baseUrl, receta, getHeaders());
  }

  actualizarReceta(idReceta: string, receta: Receta): Observable<any> {
    return this.http.put(`${this.baseUrl}/${idReceta}`, receta, getHeaders());
  }

  eliminarReceta(idReceta: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${idReceta}`, getHeaders());
  }

  getRecetasAmigo(codigoAmigo: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/amigo/${codigoAmigo}`, getHeaders());
  }

  guardarReceta(idReceta: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${idReceta}/guardar`, {}, getHeaders());
  }

  desguardarReceta(idReceta: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${idReceta}/desguardar`, {}, getHeaders());
  }
}