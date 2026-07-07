import { Component, OnInit } from '@angular/core';
import { UsuariosService } from 'src/app/services/usuarios.service';
import { AmigosService } from 'src/app/services/amigos.service';
import { AlertController, ToastController } from '@ionic/angular'; // <-- 1. Importa AlertController

@Component({
  selector: 'app-amigos',
  templateUrl: './amigos.component.html',
  styleUrls: ['./amigos.component.scss'],
})
export class AmigosComponent implements OnInit {

  miCodigo: string = '';
  codigoInput: string = '';
  solicitudes: any[] = [];
  amigos: any[] = [];

  constructor(
    private usuariosService: UsuariosService,
    private amigosService: AmigosService,
    private toastController: ToastController,
    private alertController: AlertController // <-- 2. Inyéctalo en el constructor
  ) { }

  ngOnInit() {
    this.miCodigo = this.usuariosService.codigoAmigo || 'SIN-CODIGO';
    this.cargarListasAmigos();
  }

  cargarListasAmigos() {

    this.amigos = this.usuariosService.amigos || [];
    this.solicitudes = this.usuariosService.solicitudesAmistad || [];
  }

  async confirmarEliminarAmigo(idAmigo: string, nombreAmigo: string) {
    const alert = await this.alertController.create({
      header: 'Eliminar Amigo',
      message: `¿Estás seguro de que quieres eliminar a '${nombreAmigo}' de tu lista de amigos?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => this.ejecutarEliminarAmigo(idAmigo)
        }
      ]
    });
    await alert.present();
  }

  async confirmarRespuestaSolicitud(idSolicitante: string, nombreSolicitante: string, decision: 'ACEPTAR' | 'RECHAZAR') {
    const esAceptar = decision === 'ACEPTAR';
    
    const alert = await this.alertController.create({
      header: esAceptar ? 'Aceptar Solicitud' : 'Denegar Solicitud',
      message: esAceptar 
        ? `¿Quieres aceptar la solicitud de amistad de '${nombreSolicitante}'?`
        : `¿Quieres denegar la solicitud de amistad de '${nombreSolicitante}'?`,
      buttons: [
        { text: 'Volver', role: 'cancel' },
        {
          text: esAceptar ? 'Aceptar' : 'Denegar',
          handler: () => this.ejecutarResponderSolicitud(idSolicitante, decision)
        }
      ]
    });
    await alert.present();
  }

  private ejecutarEliminarAmigo(idAmigo: string) {
    this.amigosService.eliminarAmigo(idAmigo).subscribe({
      next: (res: any) => {
        this.mostrarToast(res.msg || 'Amigo eliminado correctamente');
        this.amigos = this.amigos.filter(amigo => amigo.uid !== idAmigo);
      },
      error: (err) => this.mostrarToast(err.error?.msg || 'Error al eliminar amigo', 'danger')
    });
  }

  private ejecutarResponderSolicitud(idSolicitante: string, decision: 'ACEPTAR' | 'RECHAZAR') {
    this.amigosService.responderSolicitud(idSolicitante, decision).subscribe({
      next: (res: any) => {
        this.mostrarToast(res.msg);
        this.solicitudes = this.solicitudes.filter(sol => sol.uid !== idSolicitante);

        if (decision === 'ACEPTAR') {
          // Reutilizamos tu método validar para refrescar el token y el objeto local
          this.usuariosService.validar(true, false).subscribe({
            next: (validado) => {
              if (validado) {
                // Volvemos a extraer los arrays actualizados del servicio
                this.cargarListasAmigos();
              }
            }
          });
        }
      },
      error: (err) => this.mostrarToast('Error al procesar la solicitud', 'danger')
    });
  }

  enviarSolicitud() {
    if (!this.codigoInput) return;
    const codigoFormateado = this.codigoInput.trim().toUpperCase();

    this.amigosService.enviarSolicitud(codigoFormateado).subscribe({
      next: (res: any) => {
        this.mostrarToast(res.msg || '¡Solicitud enviada!');
        this.codigoInput = '';
      },
      error: (err) => this.mostrarToast(err.error?.msg || 'Error', 'danger')
    });
  }

  async mostrarToast(mensaje: string, color: string = 'success') {
    const toast = await this.toastController.create({ message: mensaje, duration: 2000, color: color });
    toast.present();
  }

  copiarCodigo() {
    if (!this.miCodigo) return;
    navigator.clipboard.writeText(this.miCodigo).then(() => this.mostrarToast('¡Código copiado!'));
  }
}