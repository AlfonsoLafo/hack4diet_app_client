import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Receta } from 'src/app/models/receta.model';
import { RecetasService } from 'src/app/services/recetas.service';
import { ToastService } from 'src/app/services/toast.service';
import { ExceptionsService } from 'src/app/services/exceptions.service';
import { UsuariosService } from 'src/app/services/usuarios.service';
import { PerfilService } from 'src/app/services/perfil.service';

@Component({
  selector: 'app-receta-form',
  templateUrl: './receta-form.component.html',
  styleUrls: ['./receta-form.component.scss'],
})
export class RecetaFormComponent implements OnInit {

  idReceta: string = '';
  saving: boolean = false;
  loading: boolean = false;

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

  ingredientes: string[] = [''];
  pasos: string[] = [''];

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private recetasService: RecetasService,
    private toastService: ToastService,
    private exceptionsService: ExceptionsService,
    private usuariosService: UsuariosService,
    private perfilService: PerfilService,
  ) { }

  ngOnInit() {
    this.idReceta = this.activatedRoute.snapshot.params['idReceta'] || 
                   this.activatedRoute.snapshot.params['uid'] || 
                   this.activatedRoute.snapshot.params['id']; 
    
    if (!this.idReceta) {
      this.idReceta = 'nueva';
    }

    if (this.idReceta !== 'nueva') {
      this.cargarDatosEdicion();
    }
  }

  cargarDatosEdicion() {
    this.loading = true;
    this.recetasService.getRecetaPorId(this.idReceta).subscribe({
      next: (res: any) => {
        this.fillForm(res.receta);
        this.loading = false;
      },
      error: (err) => {
        this.exceptionsService.throwError(err);
        this.loading = false;
      }
    });
  }

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
    this.ingredientes = receta.ingredientes && receta.ingredientes.length > 0 ? [...receta.ingredientes] : [''];
    this.pasos = receta.pasos && receta.pasos.length > 0 ? [...receta.pasos] : [''];
    this.publicoToggle = receta.publico;
  }

  onSubmit(form: NgForm) {
    if (form.valid) {
      this.saving = true;

      const ingredientesLimpios = this.ingredientes.filter(i => i.trim() !== '');
      const pasosLimpios = this.pasos.filter(p => p.trim() !== '');

      const nuevaReceta = new Receta(
        this.idReceta !== 'nueva' ? this.idReceta : '',
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
      Object.keys(form.controls).forEach(key => {
        form.controls[key].markAsTouched();
      });
    }
  }

  createReceta(receta: Receta) {
    this.recetasService.crearReceta(receta).subscribe({
      next: (res) => {
        this.comprobarInsigniasChef(receta);
        this.toastService.presentToast('Receta creada con éxito', 'success'); 
        this.saving = false;
        this.router.navigateByUrl('/alimentos/list'); 
      }, 
      error: (err) => {
        this.exceptionsService.throwError(err); 
        this.saving = false;
      }
    });
  }

  updateReceta(receta: Receta) {
    this.recetasService.actualizarReceta(this.idReceta, receta).subscribe({
      next: (res) => {
        this.comprobarInsigniasChef(receta);
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

  comprobarInsigniasChef(receta: Receta) {
    this.recetasService.getRecetasUsuario(this.usuariosService.uid).subscribe({
      next: (res: any) => {
        if (res.ok && res.recetas) {
          const totalRecetas = res.recetas.length;
          console.log(`Total recetas del usuario: ${totalRecetas}`);
          const totalIngredientes = receta.ingredientes.length;
          console.log(`Total ingredientes en la receta creada: ${totalIngredientes}`);

          this.perfilService.unlockChefSilver(totalRecetas);
          this.perfilService.unlockChefGold(totalIngredientes);
        }
      },
      error: (err) => console.error('Error al comprobar recetas para insignias', err)
    });
  }
}