import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Receta } from 'src/app/models/receta.model';
import { RecetasService } from 'src/app/services/recetas.service';
import { DiariosService } from 'src/app/services/diarios.service';
import { ToastService } from 'src/app/services/toast.service';
import { ExceptionsService } from 'src/app/services/exceptions.service';
import { AlimentosService } from 'src/app/services/alimentos.service';
import { Alimento } from 'src/app/models/alimento.model';
import { UsuariosService } from 'src/app/services/usuarios.service';
import { RachaModalComponent } from 'src/app/components/racha-modal/racha-modal.component';
import { RachaService } from 'src/app/services/racha.service';
import { PuntosService } from 'src/app/services/puntos.service';
import { PerfilService } from 'src/app/services/perfil.service';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-receta-view',
  templateUrl: './receta-view.component.html',
  styleUrls: ['./receta-view.component.scss'],
})
export class RecetaViewComponent implements OnInit {

  idReceta: string = '';
  receta: Receta;
  loading: boolean = true;
  saving: boolean = false;

  // En lugar de gramos, pedimos porciones. Por defecto 1.
  porcionesInput: number = 1;
  miId: string = '';

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private recetasService: RecetasService,
    private diariosService: DiariosService,
    private toastService: ToastService,
    private exceptionsService: ExceptionsService,
    private alimentosService: AlimentosService,
    private usuariosService: UsuariosService,
    private perfilService: PerfilService,
    private puntosService: PuntosService,
    private rachaService: RachaService,
    private modalController: ModalController
  ) { }

  ngOnInit() {
    this.idReceta = this.activatedRoute.snapshot.params['idReceta'];
    this.miId = this.usuariosService.uid;

    this.cargarReceta();
  }
  cargarReceta() {
    this.recetasService.getRecetaPorId(this.idReceta).subscribe({
      next: (res: any) => {
        this.receta = res.receta;
        this.loading = false;
      },
      error: (err) => {
        this.exceptionsService.throwError(err);
        this.loading = false;
      }
    });
  }

registrarReceta() {
    if (!this.porcionesInput || this.porcionesInput <= 0) {
      this.toastService.presentToast('Introduce una cantidad válida de porciones', 'warning');
      return;
    }

    const idDiario = this.diariosService.idDiarioActual;
    const categoria = this.diariosService.categoriaActual;

    // Si por algún motivo se perdió el ID del diario
    // abortamos y devolvemos al usuario al inicio para que reinicie el flujo.
    // Esto ya me ha pasado antes.
    if (!idDiario) {
      this.toastService.presentToast('Se ha perdido la conexión con el diario. Vuelve a intentarlo.', 'warning');
      this.router.navigateByUrl('/home');
      return;
    }

    this.saving = true;

    const nombreAlimentoReceta = this.receta.nombre;

    // Comprobamos si este alimento-receta ya se creó en el pasado (filtramos por marca)
    this.alimentosService.cargarAlimentosPorUsuario(10, nombreAlimentoReceta).subscribe({
      next: (res: any) => {
        const alimentosEncontrados = res.alimentos || [];

        const alimentoExistente = alimentosEncontrados.find((a: any) => 
           a.nombre === nombreAlimentoReceta && a.marca === 'Receta'
        );

        if (alimentoExistente) {
          // Si ya existe: Lo añadimos directamente al diario
          this.agregarAlDiario(idDiario, alimentoExistente.uid, this.porcionesInput, categoria);
        } else {
          // Si no existe: Creamos el alimento base
          const porcionesTotales = this.receta.porciones || 1;
          
          const nuevoAlimento = new Alimento(
            '', 
            nombreAlimentoReceta,
            'Receta',
            1, 
            'porciones',
            Number((this.receta.calorias / porcionesTotales).toFixed(0)),
            Number((this.receta.carbohidratos / porcionesTotales).toFixed(1)),
            Number((this.receta.proteinas / porcionesTotales).toFixed(1)),
            Number((this.receta.grasas / porcionesTotales).toFixed(1)),
            this.usuariosService.uid
          );

          this.alimentosService.createAlimento(nuevoAlimento).subscribe({
            next: (resCreacion: any) => {
              this.agregarAlDiario(idDiario, resCreacion.alimento.uid, this.porcionesInput, categoria);
            },
            error: (err) => {
              this.saving = false;
              this.exceptionsService.throwError(err);
            }
          });
          this.rachaService.actualizarRacha().subscribe(async (res: any) => {
            if (res.ok) {
              this.perfilService.unlockProgressSilver(res.rachaActual);
              if (res.puntosGanados && res.puntosGanados > 0) {
                
                const motivo = 'Recompensa por racha diaria';
                
                this.puntosService.registrarPuntos(res.puntosGanados, motivo, false).subscribe({
                  next: (puntosRes: any) => {
      
                    const nivelActual = puntosRes.nivelActual;
                    this.perfilService.unlockProgressGold(nivelActual);
                  },
                  error: (err) => console.error('Error al registrar los puntos:', err)
                });
                const modal = await this.modalController.create({
                  component: RachaModalComponent,
                  componentProps: {
                    rachaActual: res.rachaActual,
                    puntosGanados: res.puntosGanados
                  }
                });
                await modal.present();
              }
            }
          });
          this.perfilService.unlockChefCopper(true);
        }
      },
      error: (err) => {
        this.saving = false;
        this.exceptionsService.throwError(err);
      }
    });
  }

  private agregarAlDiario(idDiario: string, idAlimento: string, cantidad: number, categoria: string) {
    
    const alimentoAgregar = {
      idAlimento: idAlimento,
      cantidad: cantidad,
      categoria: categoria
    };

    this.diariosService.addAlimentoConsumido(idDiario, alimentoAgregar).subscribe({
      next: () => {
        this.toastService.presentToast('Receta añadida al diario', 'success');
        this.saving = false;
        this.router.navigateByUrl('/home'); 
      },
      error: (err) => {
        this.saving = false;
        this.exceptionsService.throwError(err);
      }
    });
  }

  openEditarReceta() {
    this.router.navigateByUrl(`/recetas/form/${this.idReceta}`);
  }
}