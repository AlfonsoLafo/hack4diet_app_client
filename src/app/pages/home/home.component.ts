import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Diario } from 'src/app/models/diario.model';
import { DiariosService } from 'src/app/services/diarios.service';
import { ExceptionsService } from 'src/app/services/exceptions.service';
import { UsuariosService } from 'src/app/services/usuarios.service';
import { forkJoin } from 'rxjs';
import { RachaService } from 'src/app/services/racha.service';
import { MisionDiariaService } from 'src/app/services/mision-diaria.service';
import { PuntosService } from 'src/app/services/puntos.service';

interface DiaCalendario {
  nombre: string;
  numero: number;
  fechaStr: string;
  completado: boolean;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent  implements OnInit {

  loadingDiario: boolean = true;
  loadingRacha: boolean = true;
  loadingActividadFisica: boolean = true;

  diario: Diario;
  planUsuario = this.usuariosService.plan;

  pesoActual: number = this.usuariosService.pesoActual;
  pesoObjetivo: number = this.usuariosService.pesoObjetivo;

  rachaActual: number;
  maximaRacha: number;
  diasSemanaHTML: DiaCalendario[];

  misionOriginal: string = "";
  // -- Variables del Pager --
  misionViendo: any = null;
  historialMisiones: any[] = [];
  indiceActual: number = 0;
  
  misionMostrada: string = "";
  misionRevelada: boolean = false;
  animandoMision: boolean = false;
  
  textoPrompt: string = "";
  estadoConfirmacion: 'COMPLETADA' | 'FALLIDA' | null = null;
  animacionFinalizada: boolean = false; // Controla el parpadeo de 3 veces
  nuevaMisionManana: boolean = false; // Estado de "Nueva misión mañana"
  
  // Caracteres que se usan en el pager
  caracteresCifrado: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*+<>?/";

  constructor(
    private router: Router,
    private diariosService: DiariosService,
    private usuariosService: UsuariosService,
    private exceptionsService: ExceptionsService,
    private rachaService: RachaService,
    private misionService: MisionDiariaService,
    private puntosService: PuntosService
  ) { }

  ngOnInit() {
    this.loadingDiario = true;
    this.cargarDiario();

    this.cargarSistemaMisiones();

    this.rachaService.verificarRacha().subscribe({
      next: () => {
        this.cargarRachaSemanal();
      },
      error: (err) => {
        this.loadingRacha = false;
        this.exceptionsService.throwError(err);
      }
    });
  }

  cargarSistemaMisiones() {
    this.misionService.generarMisionDiaria().subscribe((resDiaria: any) => {
      if (resDiaria.ok) {
        
        this.misionService.getHistorialMisiones().subscribe((resHistorial: any) => {
          if (resHistorial.ok) {
            this.historialMisiones = resHistorial.misiones || [];
            
            this.indiceActual = 0;
            if (this.historialMisiones.length > 0) {
              this.seleccionarMisionViendo(this.historialMisiones[0], resDiaria.nueva);
            }
          }
        });
      }
    });
  }

  seleccionarMisionViendo(mision: any, esNuevaDelBackend: boolean = false) {
    this.misionViendo = mision;
    this.estadoConfirmacion = null;
    this.animacionFinalizada = false;
    
    // Si la misión de hoy ya estaba completada o fallida, mostramos directamente el texto de mañana
    if (this.indiceActual === 0 && (mision.estado === 'COMPLETADA' || mision.estado === 'FALLIDA')) {
      this.nuevaMisionManana = true;
      this.misionRevelada = true;
      this.misionMostrada = "Nueva misión mañana";
      this.actualizarFooterNormal();
      return;
    } else {
      this.nuevaMisionManana = false;
    }

    // Comprobamos si debemos animar el descifrado
    const hoyStr = new Date().toISOString().split('T')[0];


    if ((esNuevaDelBackend || !this.misionService.yaAnimada) && this.indiceActual === 0 && mision.estado === 'PENDIENTE') {
      this.misionOriginal = mision.descripcion;
      this.misionMostrada = this.generarTextoRandom(this.misionOriginal);
      this.misionRevelada = false;
      this.textoPrompt = "[ CLICK PARA DESCIFRAR ]";
    } else {
      // Ya se vio la animación hoy o estamos mirando el historial
      this.misionOriginal = mision.descripcion;
      this.misionMostrada = this.misionOriginal;
      this.misionRevelada = true;
      this.actualizarFooterNormal();
    }
  }

  navegarMisiones(direccion: number) {
    if (this.animandoMision || this.animacionFinalizada) return; // Bloquear si está animando
    
    const nuevoIndice = this.indiceActual + direccion;
    if (nuevoIndice >= 0 && nuevoIndice < this.historialMisiones.length) {
      this.indiceActual = nuevoIndice;
      this.seleccionarMisionViendo(this.historialMisiones[this.indiceActual]);
    }
  }

  intentarCambioEstado(estado: 'COMPLETADA' | 'FALLIDA') {
    if (!this.misionRevelada || this.nuevaMisionManana) return;

    if (this.indiceActual !== 0 ) {
      this.indiceActual = 0;
      this.seleccionarMisionViendo(this.historialMisiones[this.indiceActual]);
      return
    }

    if (this.estadoConfirmacion === estado) {
      // SEGUNDO CLICK: Confirmado, ejecutamos la llamada al servidor
      this.ejecutarCompletarMision(estado);
    } else {
      // PRIMER CLICK: Pedimos confirmación
      this.estadoConfirmacion = estado;
      this.textoPrompt = "-- ¿CONFIRMAR? CLICK DE NUEVO --";
    }
  }

  ejecutarCompletarMision(estado: 'COMPLETADA' | 'FALLIDA') {
    this.estadoConfirmacion = null;
    this.textoPrompt = "";

    this.misionService.actualizarEstadoMision(this.misionViendo.uid, estado).subscribe((res: any) => {
      if (res.ok) {

        if (estado === 'COMPLETADA') {
          // Llamamos al servicio. El .subscribe() es necesario para que se ejecute la petición HTTP.
          this.puntosService.registrarPuntos(
            this.misionViendo.puntosOtorgados, 
            'completar tu misión diaria', 
            true
          ).subscribe();
        }

        this.misionViendo.estado = estado;
        this.historialMisiones[0].estado = estado;
        
        this.misionMostrada = estado === 'COMPLETADA' ? "-- MISION COMPLETADA --" : "-- MISION FALLIDA --";
        this.animacionFinalizada = true; // Activa la clase CSS de parpadeo

        setTimeout(() => {
          this.animacionFinalizada = false;
          this.nuevaMisionManana = true;
          this.misionMostrada = "Nueva misión mañana";
          this.actualizarFooterNormal();
        }, 1500);
      }
    });
  }

  actualizarFooterNormal() {
    if (!this.misionViendo) return;
    if (this.indiceActual == 0) {
      this.textoPrompt = "";
      return
    }
    const fecha = new Date(this.misionViendo.fecha).toLocaleDateString('es-ES');
    const estado = this.misionViendo.estado.toUpperCase();
    this.textoPrompt = `[ ${fecha} - ${estado} ]`;
  }

  generarTextoRandom(textoBase: string): string {
    let resultado = "";
    for (let i = 0; i < textoBase.length; i++) {
      if (textoBase[i] === ' ') {
        resultado += ' ';
      } else {
        resultado += this.caracteresCifrado.charAt(Math.floor(Math.random() * this.caracteresCifrado.length));
      }
    }
    return resultado;
  }

  revelarMision() {
    // Evitamos que múltiples clics rompan la animación
    if (this.misionRevelada || this.animandoMision) return;
    this.animandoMision = true;
    this.textoPrompt = "";

    // Obtenemos los índices de todas las letras que no son espacios
    let indices = [];
    for (let i = 0; i < this.misionOriginal.length; i++) {
      if (this.misionOriginal[i] !== ' ') indices.push(i);
    }

    // Barajamos los índices al azar
    indices = indices.sort(() => Math.random() - 0.5);

    let revelados = new Set<number>();
    // Calculamos cuántas letras revelar por fotograma para que dure ~600ms (20 fotogramas a 30ms)
    const letrasPorPaso = Math.ceil(indices.length / 20); 

    const intervalo = setInterval(() => {
      // Revelamos un lote de letras en este fotograma
      for (let i = 0; i < letrasPorPaso; i++) {
        if (indices.length > 0) {
          revelados.add(indices.pop()!);
        }
      }

      // Reconstruimos el string a mostrar
      let actual = "";
      for (let i = 0; i < this.misionOriginal.length; i++) {
        if (this.misionOriginal[i] === ' ') {
          actual += ' ';
        } else if (revelados.has(i)) {
          actual += this.misionOriginal[i]; // Letra descifrada
        } else {
          actual += this.caracteresCifrado.charAt(Math.floor(Math.random() * this.caracteresCifrado.length)); // Sigue cifrada
        }
      }
      this.misionMostrada = actual;

      // Si ya no quedan índices, terminamos la animación
      if (indices.length === 0) {
        clearInterval(intervalo);
        this.misionRevelada = true;
        this.animandoMision = false;
        // Guardamos que se ha terminado para no repetirla
        this.misionService.yaAnimada = true; 
      }
    }, 60); // ms por fotograma
  }

  cargarRachaSemanal() {
    const hoy = new Date();
    const diaSemanaActual = hoy.getDay(); // 0 = Domingo, 1 = Lunes...
    
    const distanciaAlLunes = diaSemanaActual === 0 ? -6 : 1 - diaSemanaActual;
    const lunesActual = new Date(hoy);
    lunesActual.setDate(hoy.getDate() + distanciaAlLunes);
    lunesActual.setHours(0, 0, 0, 0);

    const domingoActual = new Date(lunesActual);
    domingoActual.setDate(lunesActual.getDate() + 6);

    const mesLunes = lunesActual.getMonth() + 1;
    const anioLunes = lunesActual.getFullYear();

    const mesDomingo = domingoActual.getMonth() + 1;
    const anioDomingo = domingoActual.getFullYear();

    if (mesLunes === mesDomingo && anioLunes === anioDomingo) {
      this.rachaService.obtenerHistorialRacha(mesLunes, anioLunes).subscribe({
        next: (res: any) => {
          if (res.ok) {
            this.rachaActual = res.rachaActual;
            this.maximaRacha = res.maximaRacha;
            this.generarSemanaActual(res.historial, lunesActual);
          }
          this.loadingRacha = false;
        },
        error: (err) => {
          this.loadingRacha = false;
          this.exceptionsService.throwError(err);
        }
      });
    } 
    // CASO ESPECIAL: La semana se parte entre dos meses distintos
    else {
      const peticionMes1 = this.rachaService.obtenerHistorialRacha(mesLunes, anioLunes);
      const peticionMes2 = this.rachaService.obtenerHistorialRacha(mesDomingo, anioDomingo);

      // forkJoin ejecuta ambas peticiones en paralelo y espera a que terminen las dos
      forkJoin([peticionMes1, peticionMes2]).subscribe({
        next: ([res1, res2]: [any, any]) => {
          if (res1.ok && res2.ok) {
            // Tomamos los contadores actuales de la segunda petición (es el mes más reciente)
            this.rachaActual = res2.rachaActual;
            this.maximaRacha = res2.maximaRacha;

            // Fusionamos ambos historiales en un solo array
            const historialFusionado = [...res1.historial, ...res2.historial];
            
            this.generarSemanaActual(historialFusionado, lunesActual);
          }
          this.loadingRacha = false;
        },
        error: (err) => {
          this.loadingRacha = false;
          this.exceptionsService.throwError(err);
        }
      });
    }
  }

  generarSemanaActual(historialRachas: any[], lunesActual: Date) {
    const nombresDias = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    const nuevaSemana: DiaCalendario[] = [];

    // Iteramos 7 días de Lunes a Domingo
    for (let i = 0; i < 7; i++) {
      const diaEnCurso = new Date(lunesActual);
      diaEnCurso.setDate(lunesActual.getDate() + i);

      const estaCompletado = this.verificarDiaEnHistorial(diaEnCurso, historialRachas);

      nuevaSemana.push({
        nombre: nombresDias[i],
        numero: diaEnCurso.getDate(),
        fechaStr: diaEnCurso.toISOString().split('T')[0],
        completado: estaCompletado
      });
    }

    this.diasSemanaHTML = nuevaSemana;
  }

  private verificarDiaEnHistorial(fechaDia: Date, historial: any[]): boolean {
    const fechaEvaluar = new Date(fechaDia);
    fechaEvaluar.setHours(0, 0, 0, 0);

    return historial.some(racha => {
      const inicio = new Date(racha.fechaInicio);
      inicio.setHours(0, 0, 0, 0);
      
      let fin: Date;

      // Si la racha tiene fechaFin, ya está cerrada y usamos esa fecha exacta
      if (racha.fechaFin) {
        fin = new Date(racha.fechaFin);
      } 
      // Si no tiene fechaFin, es la racha activa. Su fin real depende de los días que llevemos.
      else {
        fin = new Date(inicio);
        // Si por algún motivo la rachaActual es 0, no hay días completados (restamos 1 para que no coincida nunca)
        if (this.rachaActual === 0) {
          fin.setDate(fin.getDate() - 1);
        } else {
          fin.setDate(fin.getDate() + (this.rachaActual - 1));
        }
      }
      
      fin.setHours(23, 59, 59, 999);

      return fechaEvaluar >= inicio && fechaEvaluar <= fin;
    });
  }

  // Cargamos el diario de hoy, si no existe se crea
  cargarDiario() {
    this.diariosService.cargarDiarioPorFecha(new Date()).subscribe(res => {
      if(!res['diario']) {
        this.crearDiario();
      } else {
        this.diario = res['diario'];
        this.loadingDiario = false;
      }
    }, (err) => {
      this.loadingDiario = false;
      this.exceptionsService.throwError(err);
    });
  }

  crearDiario() {
    this.diariosService.crearDiario(new Date()).subscribe(res => {
      this.diario = res['diario'];
      this.loadingDiario = false;
    }, (err) => {
      this.loadingDiario = false;
      this.exceptionsService.throwError(err);
    });
  }

  redirectTo(url: string) {
    this.router.navigateByUrl(url);
  }

}
