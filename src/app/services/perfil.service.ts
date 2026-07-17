import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable, tap } from 'rxjs';
import { UsuariosService } from './usuarios.service';

@Injectable({
  providedIn: 'root'
})
export class PerfilService {

  private avataresUrl = `${environment.base_url}/avatares`;
  private insigniasUrl = `${environment.base_url}/insignias`;

  private catalogoInsignias: any[] = [];

  constructor(
    private http: HttpClient,
    private usuarioService: UsuariosService
  ) { }

  getAvatares(): Observable<any> {
    // Sin uso actual
    return this.http.get(this.avataresUrl);
  }

  getInsignias(): Observable<any> {
    return this.http.get(this.insigniasUrl).pipe(
      tap((res: any) => {
        // Guardamos el catálogo en memoria al cargarlo
        this.catalogoInsignias = res.insignias || [];
      })
    );
  }

  private getInsigniaIdByClass(clase: string): string | null {
    const insignia = this.catalogoInsignias.find(ins => ins.class === clase);
    return insignia ? (insignia._id || insignia.uid) : null;
  }

  private hasBadge(clase: string): boolean {
    const usuario = this.usuarioService['usuario'];
    if (!usuario || !usuario.insigniasDesbloqueadas) return false;

    const idBuscado = this.getInsigniaIdByClass(clase);
    if (!idBuscado) return false;
    
    return usuario.insigniasDesbloqueadas.some((badge: any) => {
      if (!badge) return false;

      const idGuardado = String(badge._id || badge.uid || badge).trim();
      const idLimpio = String(idBuscado).trim();
      return idGuardado === idLimpio;
    });
  }

  private grantBadge(clase: string): void {
    const id = this.getInsigniaIdByClass(clase);
    if (!id) return;

    const usuario = this.usuarioService['usuario'];
    
    if (!usuario.insigniasDesbloqueadas) {
      usuario.insigniasDesbloqueadas = [];
    }

    const yaLaTiene = usuario.insigniasDesbloqueadas.some((badgeId: any) => String(badgeId) === String(id));

    if (yaLaTiene) {
      return;
    }

    usuario.insigniasDesbloqueadas.push(String(id));

    const usuarioActualizado = {
      ...usuario,
      insigniasDesbloqueadas: usuario.insigniasDesbloqueadas
    } as any;

    this.usuarioService.updateUser(usuarioActualizado).subscribe({
      next: () => console.log(`¡Insignia ${clase} desbloqueada y guardada!`),
      error: (err) => console.error('Error guardando la nueva insignia', err)
    });
  }

  // -----------------------------------------------------------
  // LÓGICA DE DESBLOQUEO: PROGRESO Y DEDICACIÓN
  // -----------------------------------------------------------

  unlockProgressCopper(objetivosCumplidos?: boolean): boolean {
    const clase = 'badge-copper badge-progress';
    if (this.hasBadge(clase)) return true;
    if (objetivosCumplidos === undefined || objetivosCumplidos === null) return false;

    if (objetivosCumplidos === true) {
      this.grantBadge(clase);
      return true;
    }
    return false;
  }

  unlockProgressSilver(rachaActual?: number): boolean {
    const clase = 'badge-silver badge-progress';
    if (this.hasBadge(clase)) return true;
    if (rachaActual === undefined || rachaActual === null) return false;
    // Dependencia: Debe tener la de cobre
    if (!this.unlockProgressCopper()) {return false;} 
    if (rachaActual >= 7) {
      this.grantBadge(clase);
      return true;
    }
    return false;
  }

  unlockProgressGold(nivelActual?: number): boolean {
    const clase = 'badge-gold badge-progress';
    if (this.hasBadge(clase)) return true;
    if (nivelActual === undefined || nivelActual === null) return false;

    // Dependencia: Debe tener la de plata (que a su vez comprueba la de cobre)
    if (!this.unlockProgressSilver()) return false;

    if (nivelActual >= 25) {
      this.grantBadge(clase);
      return true;
    }
    return false;
  }

  // -----------------------------------------------------------
  // LÓGICA DE DESBLOQUEO: EL CHEF
  // -----------------------------------------------------------

  unlockChefCopper(usadaReceta?: boolean): boolean {
    const clase = 'badge-copper badge-chef';

    if (this.hasBadge(clase)) return true;
    if (usadaReceta === undefined || usadaReceta === null) return false;

    if (usadaReceta === true) {
      this.grantBadge(clase);
      return true;
    }
    return false;
  }

  unlockChefSilver(totalRecetasCreadas?: number): boolean {
    const clase = 'badge-silver badge-chef';
    if (this.hasBadge(clase)) return true;
    if (totalRecetasCreadas === undefined || totalRecetasCreadas === null) return false;

    if (!this.unlockChefCopper()) return false;

    if (totalRecetasCreadas >= 5) {
      this.grantBadge(clase);
      return true;
    }
    return false;
  }

  unlockChefGold(ingredientesEnReceta?: number): boolean {
    const clase = 'badge-gold badge-chef';
    if (this.hasBadge(clase)) return true;
    if (ingredientesEnReceta === undefined || ingredientesEnReceta === null) return false;

    if (!this.unlockChefSilver()) return false;

    if (ingredientesEnReceta >= 20) {
      this.grantBadge(clase);
      return true;
    }
    return false;
  }

  // -----------------------------------------------------------
  // LÓGICA DE DESBLOQUEO: SOCIAL
  // -----------------------------------------------------------

  unlockSocialCopper(totalAmigos?: number): boolean {
    const clase = 'badge-copper badge-social';
    if (this.hasBadge(clase)) return true;
    if (totalAmigos === undefined || totalAmigos === null) return false;

    if (totalAmigos >= 1 && totalAmigos < 5) {
      this.grantBadge(clase);
      return true;
    }
    return false;
  }

  unlockSocialSilver(totalAmigos?: number): boolean {
    const clase = 'badge-silver badge-social';
    if (this.hasBadge(clase)) return true;
    if (totalAmigos === undefined || totalAmigos === null) return false;

    if (!this.unlockSocialCopper(totalAmigos)) return false;

    if (totalAmigos >= 5) {
      this.grantBadge(clase);
      return true;
    }
    return false;
  }

  unlockSocialGold(posicionLeaderboard?: number): boolean {
    const clase = 'badge-gold badge-social';
    if (this.hasBadge(clase)) return true;
    if (posicionLeaderboard === undefined || posicionLeaderboard === null) return false;

    if (!this.unlockSocialSilver(posicionLeaderboard)) return false;

    if (posicionLeaderboard === 0) {
      this.grantBadge(clase);
      return true;
    }
    return false;
  }

  // -----------------------------------------------------------
  // LÓGICA DE DESBLOQUEO: ESPECIAL (MODO OSCURO)
  // -----------------------------------------------------------

  unlockSpecialDark(modoOscuroActivado?: boolean): boolean {
    const clase = 'badge-special badge-dark';
    if (this.hasBadge(clase)) return true;
    if (modoOscuroActivado === undefined || modoOscuroActivado === null) return false;

    if (modoOscuroActivado === true) {
      this.grantBadge(clase);
      return true;
    }
    return false;
  }
}