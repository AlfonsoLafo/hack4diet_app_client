import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Receta } from 'src/app/models/receta.model';
import { RecetasService } from 'src/app/services/recetas.service';
import { ToastService } from 'src/app/services/toast.service';
import { ExceptionsService } from 'src/app/services/exceptions.service';
import { UsuariosService } from 'src/app/services/usuarios.service';

@Component({
  selector: 'app-receta-form',
  templateUrl: './receta-form.component.html',
  styleUrls: ['./receta-form.component.scss'],
})
export class RecetaFormComponent implements OnInit {

  idReceta: string = '';
  saving: boolean = false;

  // Variables del formulario
  nombreInput: string = '';
  descripcionInput: string = '';
  dificultadSelect: 'FACIL' | 'MEDIA' | 'DIFICIL' = 'MEDIA';
  tiempoInput: number = 30;
  porcionesInput: number = 2;
  caloriasInput: number = 0;
  carbosInput: number = 0;
  proteinasInput: number = 0;
  grasasInput: number = 0;
  publicoToggle: boolean = true;

  // Arrays dinámicos inicializados con un hueco vacío
  ingredientes: string[] = [''];
  pasos: string[] = [''];

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private recetasService: RecetasService,
    private toastService: ToastService,
    private exceptionsService: ExceptionsService,
    private usuariosService: UsuariosService
  ) { }

  ngOnInit() {
    this.idReceta = this.activatedRoute.snapshot.params['uid'] || this.activatedRoute.snapshot.params['id']; 
    
    if (!this.idReceta) {
      this.idReceta = 'nueva';
    }

    if (this.idReceta !== 'nueva') {
      // TODO: Para que la edición funcione al hacer click en la lista,
      // necesitarás crear un endpoint en el backend (ej: getRecetaPorId)
      // y llamarlo aquí para rellenar el formulario con this.fillForm().
      console.log('Modo edición activado para el ID:', this.idReceta);
    }
  }

  // Permite a Angular trackear los arrays de strings primitivos sin perder el foco del input
  trackByIndex(index: number, obj: any): any {
    return index;
  }

  addIngrediente() {
    this.ingredientes.push('');
  }

  removeIngrediente(index: number) {
    this.ingredientes.splice(index, 1);
  }

  addPaso() {
    this.pasos.push('');
  }

  removePaso(index: number) {
    this.pasos.splice(index, 1);
  }

  fillForm(receta: Receta) {
    this.nombreInput = receta.nombre;
    this.descripcionInput = receta.descripcion || '';
    this.dificultadSelect = receta.dificultad;
    this.tiempoInput = receta.tiempoPreparacion;
    this.porcionesInput = receta.porciones;
    this.caloriasInput = receta.calorias;
    this.carbosInput = receta.carbohidratos;
    this.proteinasInput = receta.proteinas;
    this.grasasInput = receta.grasas;
    this.ingredientes = [...receta.ingredientes];
    this.pasos = [...receta.pasos];
    this.publicoToggle = receta.publico;
  }

  onSubmit(form: NgForm) {
    if (form.valid) {
      this.saving = true;

      // Limpiamos strings vacíos que el usuario haya dejado en los arrays
      const ingredientesLimpios = this.ingredientes.filter(i => i.trim() !== '');
      const pasosLimpios = this.pasos.filter(p => p.trim() !== '');

      const nuevaReceta = new Receta(
        this.idReceta !== 'nueva' ? this.idReceta : '', // Se ignora en el backend en la creación
        this.usuariosService.uid,
        this.publicoToggle,
        this.nombreInput,
        this.descripcionInput,
        ingredientesLimpios,
        pasosLimpios,
        this.dificultadSelect,
        this.tiempoInput,
        this.porcionesInput,
        this.caloriasInput,
        this.carbosInput,
        this.proteinasInput,
        this.grasasInput,
      );

      if (this.idReceta === 'nueva') {
        this.createReceta(nuevaReceta);
      } else {
        this.updateReceta(nuevaReceta);
      }
    } else {
      // Marca todos los controles como tocados para que salte el texto rojo[cite: 6]
      Object.keys(form.controls).forEach(key => {
        form.controls[key].markAsTouched();
      });
    }
  }

  createReceta(receta: Receta) {
    this.recetasService.crearReceta(receta).subscribe({
      next: (res) => {
        this.toastService.presentToast('Receta creada con éxito', 'success'); // Mismo feedback que en alimentos[cite: 6]
        this.saving = false;
        this.router.navigateByUrl('/alimentos/list'); // Volvemos a la lista[cite: 6]
      }, 
      error: (err) => {
        this.exceptionsService.throwError(err); // Centralizamos el error[cite: 6]
        this.saving = false;
      }
    });
  }

  updateReceta(receta: Receta) {
    this.recetasService.actualizarReceta(this.idReceta, receta).subscribe({
      next: (res) => {
        this.toastService.presentToast('Receta actualizada', 'success');
        this.saving = false;
        this.router.navigateByUrl('/alimentos/list');
      },
      error: (err) => {
        this.exceptionsService.throwError(err);
        this.saving = false;
      }
    });
  }
}