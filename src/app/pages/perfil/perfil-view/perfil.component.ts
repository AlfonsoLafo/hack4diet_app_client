import { AfterViewInit, Component, OnInit } from '@angular/core';
import { PuntosService } from 'src/app/services/puntos.service';
import { UsuariosService } from 'src/app/services/usuarios.service';
import { RachaService } from 'src/app/services/racha.service';
import { AmigosService } from 'src/app/services/amigos.service';
import { PerfilService } from 'src/app/services/perfil.service';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.scss'],
})
export class PerfilComponent implements OnInit, AfterViewInit {

  chartOptionsXP: any;
  misInsigniasDestacadas: any[] = [null, null, null, null];
  avatar: any;
  
  nombreUsuario: string = '';
  nivelActual: number = 1;
  puntosActuales: number = 0;
  puntosSiguienteNivel: number = 0;
  rachaActual: number = 0;
  maximaRacha: number = 0;
  
  leaderboard: any[] = [];

  constructor(
    private puntosService: PuntosService,
    private usuariosService: UsuariosService,
    private rachaService: RachaService,
    private amigosService: AmigosService,
    private perfilService: PerfilService
  ) { }

  ngAfterViewInit() {    
    setTimeout(() => {
      this.cargarHistorialYGenerarGrafico();
    }, 100);
  }
  
  ngOnInit() {
    this.cargarDatosUsuario();
    this.cargarRachas();
    this.cargarTablaClasificacion();
    this.cargarDatosPersonalizacion()
  }

  cargarDatosPersonalizacion() {
    this.perfilService.getAvatares().subscribe({
      next: (res) => this.avatar = this.usuariosService.avatar,
      error: (err) => console.log('Error avatares', err)
    });

    this.perfilService.getInsignias().subscribe({
      next: (res) => {
        const insigniasBD = res.insignias || [];
        const destacadasIDs = this.usuariosService.insigniaDestacada || []; 

        for (let i = 0; i < 4; i++) {
          if (destacadasIDs[i]) {
            const insigniaCompleta = insigniasBD.find(ins => ins._id === destacadasIDs[i] || ins.uid === destacadasIDs[i]);
            this.misInsigniasDestacadas[i] = insigniaCompleta || null;
          } else {
            this.misInsigniasDestacadas[i] = null;
          }
        }
      },
      error: (err) => console.log('Error insignias', err)
    });
  }

  cargarRachas() {
    this.rachaService.obtenerRachaActual().subscribe({
      next: (res: any) => {
        const datosRacha = res.racha || res; 
        
        this.rachaActual = datosRacha.rachaActual || 0;
        this.maximaRacha = datosRacha.maximaRacha || 0;
      },
      error: (err) => {
        console.error('Error al cargar las rachas:', err);
        this.rachaActual = 0;
        this.maximaRacha = 0;
      }
    });
  }

  cargarDatosUsuario() {
    this.nombreUsuario = this.usuariosService.nombre;
    this.puntosActuales = this.usuariosService.puntos;
    
    this.nivelActual = this.calcularNivel(this.puntosActuales);
    this.perfilService.unlockProgressGold(this.nivelActual);
    this.puntosSiguienteNivel = 25 * Math.pow(this.nivelActual, 2);
  }

  calcularNivel (puntos: number) {
    return Math.floor(0.2 * Math.sqrt(puntos)) + 1
  }

  cargarTablaClasificacion() {
    const miCodigo = this.usuariosService.codigoAmigo;
    
    if (!miCodigo) return;

    this.amigosService.getLeaderboard(miCodigo).subscribe({
      next: (res: any) => {
        this.leaderboard = res.leaderboard || [];
        this.perfilService.unlockSocialSilver(this.leaderboard.length - 1);
        this.perfilService.unlockSocialGold(this.leaderboard.findIndex(entry => entry.codigoAmigo === miCodigo));
      },
      error: (err) => {
        console.error('Error al cargar el leaderboard:', err);
      }
    });
  }

  cargarHistorialYGenerarGrafico() {
    const hoy = new Date();
    
    const hace7Dias = new Date();
    hace7Dias.setDate(hoy.getDate() - 6);
    hace7Dias.setHours(0, 0, 0, 0);

    const desde = hace7Dias.toISOString();
    const hasta = hoy.toISOString(); // Hasta el momento actual

    this.puntosService.getHistorialPuntos(desde, hasta).subscribe((res: any) => {
      const entradas = res.historial || res.entradas || res; 
      this.procesarDatos(entradas, hoy);
    });
  }

  procesarDatos(entradas: any[], hoy: Date) {
    const nombresDias = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    const etiquetasX: string[] = [];
    const datosPuntos: number[] = [0, 0, 0, 0, 0, 0, 0];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(hoy.getDate() - i);
      etiquetasX.push(nombresDias[d.getDay()]);
    }

    const hoyNormalizado = new Date();
    hoyNormalizado.setHours(0, 0, 0, 0);

    entradas.forEach(entrada => {
      const fechaEntrada = new Date(entrada.fecha);
      fechaEntrada.setHours(0, 0, 0, 0);

      const diffTiempo = hoyNormalizado.getTime() - fechaEntrada.getTime();
      const diffDias = Math.floor(diffTiempo / (1000 * 60 * 60 * 24));

      if (diffDias >= 0 && diffDias <= 6) {
        const index = 6 - diffDias;
        datosPuntos[index] += entrada.puntosGanados;
      }
    });

    this.dibujarGrafico(etiquetasX, datosPuntos);
  }

  dibujarGrafico(etiquetas: string[], datos: number[]) {
    const isDarkMode = document.body.classList.contains('dark');
    const rootStyles = getComputedStyle(document.body);
    const primaryColor = rootStyles.getPropertyValue('--ion-color-primary').trim() || '#3880ff';
    const textColor = isDarkMode ? '#ffffff' : '#333333';
    const gridColor = isDarkMode ? '#333333' : '#e0e0e0';

    this.chartOptionsXP = {
      series: [{ name: "XP Ganada", data: datos }],
      chart: { type: 'bar', height: 200, toolbar: { show: false }, foreColor: textColor, animations: { enabled: true } },
      colors: [primaryColor],
      plotOptions: { bar: { borderRadius: 4, columnWidth: '50%' } },
      xaxis: { categories: etiquetas, labels: { style: { colors: textColor } } },
      grid: { borderColor: gridColor, strokeDashArray: 4 }
    };
  }
}