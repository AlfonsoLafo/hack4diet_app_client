import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-insignia',
  templateUrl: './insignia.component.html',
  styleUrls: ['./insignia.component.scss'],
})
export class InsigniaComponent {
  
  @Input() insignia: any = null; // Si es null, dibuja el slot vacío
  @Input() bloqueada: boolean = false;

  getIconoPrincipal(clases: string): string {
    if (!clases) return 'medal';
    if (clases.includes('badge-progress')) return 'trophy';
    if (clases.includes('badge-chef')) return 'restaurant';
    if (clases.includes('badge-social')) return 'people';
    if (clases.includes('badge-dark')) return 'moon';
    return 'medal';
  }

  getEstrellas(clases: string): number[] {
    if (!clases) return [];
    if (clases.includes('badge-gold')) return [1, 2, 3];
    if (clases.includes('badge-silver')) return [1, 2];
    if (clases.includes('badge-copper')) return [1];
    if (clases.includes('badge-special')) return [1];
    return [];
  }
}