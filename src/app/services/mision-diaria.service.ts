import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { UsuariosService } from './usuarios.service';
import { getHeaders } from '../utils/headers.utils';

@Injectable({
  providedIn: 'root'
})
export class MisionDiariaService {

  idUsuario: string = this.usuariosService.uid;
  yaAnimada: boolean = false;

  constructor(
    private http: HttpClient,
    private usuariosService: UsuariosService
  ) { }

  generarMisionDiaria() {
    return this.http.post(`${environment.base_url}/misiones/${this.idUsuario}/hoy`, {}, getHeaders());
  }

  getHistorialMisiones() {
    return this.http.get(`${environment.base_url}/misiones/${this.idUsuario}`, getHeaders());
  }

  actualizarEstadoMision(idMision: string, estado: 'COMPLETADA' | 'FALLIDA') {
    return this.http.put(`${environment.base_url}/misiones/${idMision}/completar`, { estado }, getHeaders());
  }
  
}