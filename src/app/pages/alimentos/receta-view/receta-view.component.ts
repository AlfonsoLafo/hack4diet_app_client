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

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private recetasService: RecetasService,
    private diariosService: DiariosService,
    private toastService: ToastService,
    private exceptionsService: ExceptionsService,
    private alimentosService: AlimentosService,
    private usuariosService: UsuariosService
  ) { }

  ngOnInit() {
    this.idReceta = this.activatedRoute.snapshot.params['idReceta'];
    
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

    // --- NUEVO BLINDAJE ---
    // Si por algún motivo se perdió el ID del diario (ej: recargar la página), 
    // abortamos y devolvemos al usuario al inicio para que reinicie el flujo.
    if (!idDiario) {
      this.toastService.presentToast('Se ha perdido la conexión con el diario. Vuelve a intentarlo.', 'warning');
      this.router.navigateByUrl('/home'); // O la ruta donde esté tu diario
      return;
    }
    // ----------------------

    this.saving = true;

    // Generamos el nombre estandarizado para la porción base
    const nombreAlimentoReceta = this.receta.nombre;

    // 1. Comprobamos si este alimento-receta ya se creó en el pasado (filtramos por marca)
    this.alimentosService.cargarAlimentosPorUsuario(10, nombreAlimentoReceta).subscribe({
      next: (res: any) => {
        const alimentosEncontrados = res.alimentos || [];
        // Nos aseguramos de que sea nuestra receta y no un alimento con el mismo nombre
        const alimentoExistente = alimentosEncontrados.find((a: any) => 
           a.nombre === nombreAlimentoReceta && a.marca === 'Receta'
        );

        if (alimentoExistente) {
          // 2A. Ya existe: Lo añadimos directamente al diario
          this.agregarAlDiario(idDiario, alimentoExistente.uid, this.porcionesInput, categoria);
        } else {
          // 2B. No existe: Creamos el alimento base
          const porcionesTotales = this.receta.porciones || 1;
          
          const nuevoAlimento = new Alimento(
            '', 
            nombreAlimentoReceta, // Nombre limpio
            'Receta', // Marca exacta
            1, 
            'porciones', // Unidad personalizada
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
        }
      },
      error: (err) => {
        this.saving = false;
        this.exceptionsService.throwError(err);
      }
    });
  }

  // Método auxiliar para no repetir código
  private agregarAlDiario(idDiario: string, idAlimento: string, cantidad: number, categoria: string) {
    
    // Construimos el objeto tal y como lo espera el backend
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
}