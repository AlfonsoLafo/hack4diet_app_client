import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { UsuariosService } from 'src/app/services/usuarios.service';

@Component({
  selector: 'app-privacidad-modal',
  templateUrl: './opciones-privacidad-modal.component.html',
  styleUrls: ['./opciones-privacidad-modal.component.scss'],
})
export class PrivacidadModalComponent implements OnInit {

  // Objeto local para manejar los toggles en la vista
  privacidad = {
    currentStreak: true,
    maximumStreak: true,
    points: true,
    badges: true
  };

  guardando: boolean = false;

  constructor(
    private modalCtrl: ModalController,
    private usuariosService: UsuariosService
  ) { }

  ngOnInit() {
    // Cargamos la configuración actual usando tu getter
    const opcionesActuales = this.usuariosService.opcionesPrivacidad;
    
    if (opcionesActuales) {
      // Hacemos una copia para no mutar el estado original hasta que se guarde
      this.privacidad = { ...opcionesActuales };
    }
  }

  cerrar() {
    this.modalCtrl.dismiss();
  }

  guardarCambios() {
    this.guardando = true;

    // Construimos el objeto usuario para el PUT, usando la técnica que reparamos antes
    const usuarioActualizado = {
      ...this.usuariosService['usuario'], 
      opcionesPrivacidad: this.privacidad
    } as any;

    this.usuariosService.updateUser(usuarioActualizado).subscribe({
      next: () => {
        // Actualizamos el modelo local del servicio
        if (this.usuariosService['usuario']) {
          this.usuariosService['usuario'].opcionesPrivacidad = this.privacidad;
        }
        this.guardando = false;
        this.modalCtrl.dismiss(true);
      },
      error: (err) => {
        console.error('Error al actualizar privacidad', err);
        this.guardando = false;
        // Aquí puedes meter un Toast de error si lo deseas
      }
    });
  }
}