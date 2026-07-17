import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { Diario } from 'src/app/models/diario.model';
import { DiariosService } from 'src/app/services/diarios.service';
import { ExceptionsService } from 'src/app/services/exceptions.service';
import { ToastService } from 'src/app/services/toast.service';
import { UsuariosService } from 'src/app/services/usuarios.service';
import { PuntosService } from 'src/app/services/puntos.service';

@Component({
  selector: 'app-consumo-agua',
  templateUrl: './consumo-agua.component.html',
  styleUrls: ['./consumo-agua.component.scss'],
})
export class ConsumoAguaComponent  implements OnInit {

  selectedDate: Date = new Date();

  diario: Diario = new Diario('');
  aguaRecomendada: number = Math.round(this.usuariosService.pesoActual * 35); // recomendacion de la OMS

  aguaPersonalizada: number;

  constructor(
    private diariosService: DiariosService,
    private toastService: ToastService,
    private usuariosService: UsuariosService,
    private alertController: AlertController,
    private exceptionsService: ExceptionsService,
    private puntosService: PuntosService) { }

  ngOnInit() {
    this.cargarDiarioPorFecha(this.selectedDate);
  }

  onDateChange(dates: any) {
    this.selectedDate = dates.startDate;
    this.cargarDiarioPorFecha(this.selectedDate);
  }

  cargarDiarioPorFecha(date: Date) {
    this.diariosService.cargarDiarioPorFecha(date).subscribe(res => {
      if(!res['diario']) {
        this.crearDiario(date);
      } else {
        this.diario = res['diario'];
      }
    }, (err) => {
      this.exceptionsService.throwError(err);
    });
  }

  crearDiario(date: Date) {
    this.diariosService.crearDiario(date).subscribe(res => {
      this.diario = res['diario'];
    }, (err) => {
      this.exceptionsService.throwError(err);
    });
  }

  editarAguaConsumida(agua: number, manual: boolean) {
    if( agua == null || agua < 0) return;

    // Hay que guardar la cantiad para que no se pueda ganaar puntos varias veces al día
    const aguaAnterior = this.diario.aguaConsumida || 0;
    const nuevaAgua = manual ? agua : aguaAnterior + agua;

    this.diario.aguaConsumida = nuevaAgua;

    this.diariosService.updateDiario(this.diario).subscribe({
      next: (res) => {
        this.toastService.presentToast('Cantidad editada', 'success');
        
        if (aguaAnterior < this.aguaRecomendada && nuevaAgua >= this.aguaRecomendada) {
          const motivo = 'Alcanzar la cantidad recomendada de agua consumida';
          
          this.puntosService.registrarPuntos(20, motivo, true).subscribe({
            next: (puntosRes: any) => {
              this.usuariosService.sumarPuntosLocal(20);
            },
            error: (err) => console.error('Error al registrar los puntos de agua:', err)
          });
        }

        this.cargarDiarioPorFecha(this.selectedDate);
      }, 
      error: (err) => {
        this.exceptionsService.throwError(err);
      }
    });
  }

  async presentAlert() {
    const alert = await this.alertController.create({
      header: 'Editar agua consumida',
      inputs: [
        {
          placeholder: 'Editar agua',
          attributes: {
            type: 'number',
            value: this.diario.aguaConsumida
          }
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'text-danger d-inline',
        },
        {
          text: 'Aceptar',
          cssClass: 'd-inline',
          handler: (data) => {
            const agua = parseFloat(data[0]);
            if (!isNaN(agua) && agua >= 0) {
              this.editarAguaConsumida(agua, true);
              return true;
            } else {
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

}
