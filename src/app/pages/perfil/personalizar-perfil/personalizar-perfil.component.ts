import { Component, OnInit } from '@angular/core';
import { UsuariosService } from 'src/app/services/usuarios.service';
import { PerfilService } from 'src/app/services/perfil.service';

@Component({
  selector: 'app-personalizar-perfil',
  templateUrl: './personalizar-perfil.component.html',
  styleUrls: ['./personalizar-perfil.component.scss'],
})
export class PersonalizarPerfilComponent implements OnInit {

  avatares: any[] = [];
  insigniasBD: any[] = []; 
  
  idsDesbloqueadas: string[] = [];
  misInsigniasDestacadas: any[] = [null, null, null, null];

  constructor(
    private perfilService: PerfilService,
    private usuariosService: UsuariosService
  ) { }

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.perfilService.getAvatares().subscribe({
      next: (res) => this.avatares = res.avatares || [1, 2, 3, 4, 5],
      error: (err) => console.log('Error avatares', err)
    });

    this.perfilService.getInsignias().subscribe({
      next: (res) => {
        this.insigniasBD = res.insignias || [];
        this.procesarInsigniasUsuario();
      },
      error: (err) => console.log('Error insignias', err)
    });
  }

  procesarInsigniasUsuario() {
    this.idsDesbloqueadas = this.usuariosService.insigniasDesbloqueadas || [];
    const destacadasIDs = this.usuariosService.insigniaDestacada || []; 

    for (let i = 0; i < 4; i++) {
      if (destacadasIDs[i]) {
        const insigniaCompleta = this.insigniasBD.find(ins => ins._id === destacadasIDs[i] || ins.uid === destacadasIDs[i]);
        this.misInsigniasDestacadas[i] = insigniaCompleta || null;
      } else {
        this.misInsigniasDestacadas[i] = null;
      }
    }
  }

  esDesbloqueada(insignia: any): boolean {
    if (!insignia) return false;

    if (!this.idsDesbloqueadas || this.idsDesbloqueadas.length === 0) return false;

    const idInsigniaCatalogo = String(insignia._id || insignia.uid).trim();

    return this.idsDesbloqueadas.some((idGuardado: any) => {
      if (!idGuardado) return false;

      const strGuardado = String(idGuardado._id || idGuardado.uid || idGuardado).trim();
      return strGuardado === idInsigniaCatalogo;
    });
  }

  seleccionarAvatar(avatar: any) {
    // Lógica para equipar avatar...
    // No se ha llegado a implementar
  }

  gestionarInsignia(insignia: any) {
    if (!this.esDesbloqueada(insignia)) {
      return; 
    }

    const id = insignia._id || insignia.uid;
    
    // Comprobamos si la insignia ya está equipada en los 4 slots
    const indexEquipada = this.misInsigniasDestacadas.findIndex(
      (slot) => slot && (slot._id === id || slot.uid === id)
    );

    if (indexEquipada !== -1) {
      // Si está equipada, la quitamos (dejamos el slot en null)
      this.misInsigniasDestacadas[indexEquipada] = null;
    } else {
      // Si NO está equipada, buscamos el primer hueco libre
      const primerHueco = this.misInsigniasDestacadas.findIndex(slot => slot === null);
      
      if (primerHueco !== -1) {
        this.misInsigniasDestacadas[primerHueco] = insignia;
      } else {
        // TODO: Mostrar un Toast informando al usuario (ej: this.toastService.present('No tienes huecos libres'))
        console.log('No tienes huecos libres. Desequipa una insignia primero.');
        return; 
      }
    }

    this.guardarInsigniasEnBackend();
  }

  guardarInsigniasEnBackend() {
    const arrayIds = this.misInsigniasDestacadas
      .filter(ins => ins !== null)
      .map(ins => ins._id || ins.uid);

    const usuarioActualizado = {
      ...this.usuariosService['usuario'], 
      insigniasDestacada: arrayIds
    } as any;

    this.usuariosService.updateUser(usuarioActualizado).subscribe({
      next: (res: any) => {
        console.log('Insignias destacadas actualizadas correctamente');
        if (this.usuariosService['usuario']) {
          this.usuariosService['usuario'].insigniasDestacada = arrayIds;
        }
      },
      error: (err) => console.error('Error guardando las insignias', err)
    });
  }
}