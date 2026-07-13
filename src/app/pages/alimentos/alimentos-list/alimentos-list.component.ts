import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Alimento } from 'src/app/models/alimento.model';
import { AlimentosService } from 'src/app/services/alimentos.service';
import { DiariosService } from 'src/app/services/diarios.service';
import { UsuariosService } from 'src/app/services/usuarios.service';
import { getAbrebiaturaUnidadMedida } from 'src/app/utils/unidad-medida.utils';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import * as tf from '@tensorflow/tfjs';
import food_data from '../../../../assets/food_data.json';
import { ExceptionsService } from 'src/app/services/exceptions.service';
import { catchError, forkJoin, of } from 'rxjs';
import { RecetasService } from 'src/app/services/recetas.service';

@Component({
  selector: 'app-alimentos-list',
  templateUrl: './alimentos-list.component.html',
  styleUrls: ['./alimentos-list.component.scss'],
})
export class AlimentosListComponent  implements OnInit {

  listaResultados: any[] = []; // Cambiamos de Alimento[] a any[] temporalmente (o a (Alimento | Receta)[])
  segmentActual: 'mis-alimentos' | 'biblioteca' | 'recetas' = 'biblioteca';

  categoria: string = '';
  idDiario: string = '';
  textoBusqueda: string = '';
  resultados: number = 10;
  noResultsFound: boolean = false;

  loading: boolean = false;
  miId: string = '';

  // para la captura de alimentos
  capturandoAlimento: boolean = false;
  model: any;
  predictions: any;
  image: any;
  labels_20 = [
    'apple_pie','caesar_salad','cheesecake','chicken_curry','churros','donuts','escargots','fish_and_chips','french_fries','greek_salad','hamburguer','ice_cream','macarons','omelette','paella','pizza','ramen','spring_rolls','sushi','tacos'
  ];
  foodList: {nombre_pred: string, nombre: string, calorias: number, grasas: number, proteinas :number, carbohidratos :number}[] = food_data;

  constructor(private diariosService: DiariosService,
    private alimentosService: AlimentosService,
    private router: Router,
    private usuariosService: UsuariosService,
    private exceptionsService: ExceptionsService,
    private recetasService: RecetasService
  ) {}

  ngOnInit() {
    this.categoria = this.diariosService.categoriaActual;
    this.idDiario = this.diariosService.idDiarioActual;
    this.miId = this.usuariosService.uid;
    this.loadModel();
  }

  onSearchbarChange(event) {
    this.textoBusqueda = event.detail.value;
    this.cargarAlimentos();
  }

  onSegmentChange(event) {
    this.segmentActual = event.detail.value;
    this.cargarAlimentos();
  }

  cargarAlimentos() {
    this.noResultsFound = false;
    this.listaResultados = [];

    if(this.segmentActual === 'mis-alimentos') {
      this.alimentosService.cargarAlimentosPorUsuario(this.resultados, this.textoBusqueda).subscribe(res => {
        this.listaResultados = res['alimentos'];
        this.comprobarSiHayResultados();
        this.loading = false;
      }, (err) => {
        this.exceptionsService.throwError(err);
        this.loading = false;
      });
    } else if (this.segmentActual === 'biblioteca') {
      this.alimentosService.cargarAlimentosOpenFoodFacts(this.resultados, this.textoBusqueda).subscribe(res => {
        this.filterAlimentosData(res['searchResults']);
        this.comprobarSiHayResultados();
        this.loading = false;
      }, (err) => {
        this.exceptionsService.throwError(err);
        this.loading = false;
      });
    } else if (this.segmentActual === 'recetas') {
      // Para las recetas, cargamos siempre todo y luego filtramos localmente si hay búsqueda
      this.loading = true;
      this.cargarRecetasCombinadas();
    }
  }

  cargarRecetasCombinadas() {
    this.loading = true;

    // Obtenemos el array de amigos del usuario actual
    const amigos = this.usuariosService.amigos || [];

    // Creamos un array de peticiones (Observables) individuales por cada amigo
    const peticionesAmigos = amigos.map((amigo: any) => {
      // Extraemos el código de amigo (adaptable por si tu array tiene objetos o strings)
      const codigo = amigo.codigoAmigo || amigo; 
      
      return this.recetasService.getRecetasAmigo(codigo).pipe(
        // Si la petición de un amigo falla (ej. código incorrecto), devolvemos un array vacío 
        // en lugar de romper todo el forkJoin principal
        catchError(() => of({ ok: true, recetas: [] }))
      );
    });

    // Disparamos todas las peticiones a la vez
    forkJoin({
      propias: this.recetasService.getRecetasUsuario(this.miId),
      guardadas: this.recetasService.getRecetasGuardadas(this.miId),
      // Si hay amigos, ejecutamos sus peticiones en paralelo; si no, devolvemos un array vacío
      amigos: peticionesAmigos.length > 0 ? forkJoin(peticionesAmigos) : of([])
    }).subscribe({
      next: (res: any) => {
        let todas: any[] = [];
        const idsYaAñadidos = new Set(); // Para evitar duplicados rápidos
        
        // 1. Añadimos las PROPIAS
        if (res.propias.ok) {
          res.propias.recetas.forEach((r: any) => {
            todas.push(r);
            idsYaAñadidos.add(r._id || r.uid);
          });
        }

        // 2. Añadimos las GUARDADAS
        if (res.guardadas.ok) {
          res.guardadas.recetas.forEach((r: any) => {
            const id = r._id || r.uid;
            // Solo las añadimos si no son nuestras (por seguridad) y no están ya en la lista
            if (r.idPropietario !== this.miId && !idsYaAñadidos.has(id)) {
              todas.push(r);
              idsYaAñadidos.add(id);
            }
          });
        }

        // 3. Añadimos las de los AMIGOS
        if (Array.isArray(res.amigos)) {
          res.amigos.forEach((resAmigo: any) => {
            if (resAmigo && resAmigo.ok && resAmigo.recetas) {
              resAmigo.recetas.forEach((r: any) => {
                const id = r._id || r.uid;
                if (!idsYaAñadidos.has(id)) {
                  todas.push(r);
                  idsYaAñadidos.add(id);
                }
              });
            }
          });
        }

        // Si el usuario ha escrito en el buscador, filtramos localmente por nombre
        if (this.textoBusqueda.trim() !== '') {
          const busquedaLimpia = this.textoBusqueda.toLowerCase().trim();
          todas = todas.filter(r => (r.nombre || r.titulo).toLowerCase().includes(busquedaLimpia));
        }

        // ORDENACIÓN: 1º Guardadas (favoritos), 2º Feed Amigos y Propias
        this.listaResultados = todas.sort((a, b) => {
          const aGuardada = this.esRecetaGuardada(a) ? 1 : 0;
          const bGuardada = this.esRecetaGuardada(b) ? 1 : 0;
          return bGuardada - aGuardada;
        });

        this.comprobarSiHayResultados();
        this.loading = false;
      },
      error: (err) => {
        this.exceptionsService.throwError(err);
        this.loading = false;
      }
    });
  }

  esRecetaGuardada(receta: any): boolean {
    const id = receta._id || receta.uid;
    return this.usuariosService.recetasGuardadas?.includes(id);
  }
  
  toggleFavorito(receta: any, event: Event) {
    event.stopPropagation(); // ¡Vital para no abrir la vista de la receta al hacer clic en la estrella!
    
    const id = receta._id || receta.uid;
    const isGuardada = this.esRecetaGuardada(receta);
    
    // Obtenemos la referencia al array a través del getter
    const guardadas = this.usuariosService.recetasGuardadas;

    if (isGuardada) {
      this.recetasService.desguardarReceta(id).subscribe({
        next: () => {
          // Encontramos la posición del ID y lo eliminamos (mutando el array original)
          if (guardadas) {
            const index = guardadas.indexOf(id);
            if (index > -1) {
              guardadas.splice(index, 1);
            }
          }
        },
        error: (err) => console.error('Error al desguardar receta', err)
      });
    } else {
      this.recetasService.guardarReceta(id).subscribe({
        next: () => {
          // Añadimos el nuevo ID al final (mutando el array original)
          if (guardadas) {
            guardadas.push(id);
          }
        },
        error: (err) => console.error('Error al guardar receta', err)
      });
    }
  }
    
  seleccionarItem(item: any) {
    if (this.segmentActual === 'recetas') {
      const id = item._id || item.uid;
      
      this.router.navigateByUrl(`/recetas/view/${id}`);
      
    } else {
      this.registrarAlimentoConsumido(item);
    }
  }

  filterAlimentosData(searchResults: any[]) {
    let index = 0;
    searchResults.forEach(result => {
      const nutrientes = result.nutriments;
      const alimento = new Alimento(index.toString(), result.product_name, result.brands, 100, 'gramos', nutrientes['energy-kcal_100g'],
        nutrientes['carbohydrates_100g'], nutrientes['proteins_100g'], nutrientes['fat_100g'], this.usuariosService.uid);
      this.listaResultados.push(alimento);
      index++;
    })
  }

  getSubtituloAlimento(alimento: Alimento): string {
    let subtitulo = alimento.marca != null ? alimento.marca : '';
    const cantidadConUnidad = `${alimento.cantidadReferencia} ${getAbrebiaturaUnidadMedida(alimento.unidadMedida)}`;
    subtitulo += alimento.marca != null ? ` (${cantidadConUnidad})` : `${cantidadConUnidad}`;
    return subtitulo;
  }

  comprobarSiHayResultados() {
    this.noResultsFound = this.listaResultados.length == 0;
  }

  registrarAlimentoConsumido(alimento: Alimento) {
    if(this.segmentActual === 'mis-alimentos') {
      this.goToRegistroAlimento(alimento.uid);
    } else {
      this.alimentosService.createAlimento(alimento).subscribe(res => {
        this.goToRegistroAlimento(res['alimento'].uid);
      });
    }
  }

  goToRegistroAlimento(idAlimento: string) {
    this.diariosService.idAlimentoActual = idAlimento;
    this.router.navigateByUrl('/alimentos/registro');
  }

  // logica para la captura de alimentos
  async loadModel(){
    this.model = await tf.loadLayersModel("../../../assets/modelos/modelo_vgg16/model.json");
  }

  async capturarAlimento() {
    try {
      const capturedPhoto = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        quality: 100
      });
      this.image = capturedPhoto.dataUrl;
      this.predict();
    } catch (error) {
      if (error.message === 'User cancelled photos app') {
        console.log('El usuario cerró la cámara sin usarla.');
      } else {
        console.error('Ocurrió un error inesperado:', error);
      }
    }
  }


  async predict() {
    this.capturandoAlimento = true;
    tf.tidy(() => {
      const imgObject = new Image();
      imgObject.src = this.image;
      imgObject.crossOrigin = "anonymus";
      imgObject.onload = () => {
        let img = tf.browser.fromPixels(imgObject).resizeBilinear([224,224]);
        img = img.reshape([1,224,224,3]);
        img = tf.cast(img, 'float32');
        const output = this.model.predict(img) as any;
        this.predictions = Array.from(output.dataSync());
        const predictedMax =  this.predictions.indexOf(Math.max(...this.predictions));
        const foodData = this.foodList[predictedMax];
        this.alimentosService.alimentoCapturado = new Alimento('', foodData.nombre, null, 100, 'gramos', foodData.calorias,
                                      foodData.carbohidratos, foodData.proteinas, foodData.grasas, this.usuariosService.uid);
        this.router.navigateByUrl('/alimentos/form/capturado');
        this.capturandoAlimento = false;
      }
    });
  }

}
