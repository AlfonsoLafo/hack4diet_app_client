import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-racha-modal',
  templateUrl: './racha-modal.component.html',
  styleUrls: ['./racha-modal.component.scss'],
})

export class RachaModalComponent implements OnInit {

  @Input() rachaActual: number;
  @Input() puntosGanados: number;

  mensajePersonalizado: string = '';
  
  // Tabla estática de recompensas para pintar la lista
  diasRecompensa = [
    { dia: 1, puntos: 3 },
    { dia: 2, puntos: 5 },
    { dia: 3, puntos: 7 },
    { dia: 4, puntos: 9 },
    { dia: 5, puntos: 11 },
    { dia: 6, puntos: 13 },
    { dia: 7, puntos: 15 } // Día 7 o superior
  ];

  constructor(private modalCtrl: ModalController) { }

  ngOnInit() {
    this.generarMensaje();
  }

  generarMensaje() {
    if (this.rachaActual === 1) {
      this.mensajePersonalizado = 'Todo gran viaje comienza con un primer paso. Acabas de iniciar tu racha.';
    } else if (this.rachaActual >= 7) {
      this.mensajePersonalizado = '¡Felicidades! Has alcanzado el multiplicador máximo de puntos por tu constancia.';
    } else {
      this.mensajePersonalizado = '¡Sigue así! Cada día consecutivo acumulas más puntos y te acercas a tu meta.';
    }
  }

  getDiaDestacado(): number {
    return this.rachaActual >= 7 ? 7 : this.rachaActual;
  }

  cerrar() {
    this.modalCtrl.dismiss();
  }
}