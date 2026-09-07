import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor(private http: HttpClient) { }

  getPokemonData(): Observable<any> {
    return this.http.get('/assets/data/pokemon.json');
  }

  getNarutoData(): Observable<any> {
    return this.http.get('/assets/data/naruto.json');
  }
}