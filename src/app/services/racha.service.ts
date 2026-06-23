import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { UsuariosService } from './usuarios.service';
import { getHeaders } from '../utils/headers.utils';

@Injectable({
  providedIn: 'root'
})
export class RachaService {

  idUsuario: string = this.usuariosService.uid;

  constructor(
    private http: HttpClient, 
    private usuariosService: UsuariosService
  ) { }

  verificarRacha() {
    return this.http.put(`${environment.base_url}/racha/verificar`, {}, getHeaders());
  }

  obtenerHistorialRacha(mes?: number, anio?: number) {
    let url = `${environment.base_url}/historial-racha`;
    
    if (mes && anio) {
      url += `?mes=${mes}&anio=${anio}`;
    }

    return this.http.get(url, getHeaders());
  }

  actualizarRacha() {
    return this.http.post(`${environment.base_url}/racha`, {}, getHeaders());
  }

  obtenerRachaActual() {
    return this.http.get(`${environment.base_url}/racha`, getHeaders());
  }
}