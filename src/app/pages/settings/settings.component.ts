import { Component, OnInit } from '@angular/core';
import { AccentColor, AppSettingsService, FontSize } from '../../shared/app-settings.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  hintLimit = 5;
  fontSize: FontSize = 'medium';
  color: AccentColor = 'red';
  highContrast = false;
  soundEnabled = true;
  saved = false;
  fontSizeOptions: FontSize[] = ['small', 'medium', 'large'];
  colorOptions: { value: AccentColor; label: string; swatch: string }[] = [
    { value: 'red', label: 'レッド', swatch: '#d32f2f' },
    { value: 'blue', label: 'ブルー', swatch: '#1565c0' },
    { value: 'green', label: 'グリーン', swatch: '#2e7d32' },
    { value: 'purple', label: 'パープル', swatch: '#6a1b9a' },
    { value: 'yellow', label: 'イエロー', swatch: '#f9a825' },
  ];

  constructor(private appSettingsService: AppSettingsService) {}

  ngOnInit(): void {
    this.hintLimit = this.appSettingsService.getHintLimit('中級');
    this.fontSize = this.appSettingsService.getFontSize();
    this.color = this.appSettingsService.getColor();
    this.highContrast = this.appSettingsService.getHighContrast();
    this.soundEnabled = this.appSettingsService.getSoundEnabled();
  }

  saveHintLimit(): void {
    this.hintLimit = Math.min(99, Math.max(1, this.hintLimit));
    this.appSettingsService.setHintLimit('中級', this.hintLimit);
    this.flashSaved();
  }

  selectFontSize(size: FontSize): void {
    this.fontSize = size;
    this.appSettingsService.setFontSize(size);
    this.flashSaved();
  }

  selectColor(color: AccentColor): void {
    this.color = color;
    this.appSettingsService.setColor(color);
    this.flashSaved();
  }

  selectHighContrast(enabled: boolean): void {
    this.highContrast = enabled;
    this.appSettingsService.setHighContrast(enabled);
    this.flashSaved();
  }

  selectSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    this.appSettingsService.setSoundEnabled(enabled);
    this.flashSaved();
  }

  private flashSaved(): void {
    this.saved = true;
    setTimeout(() => this.saved = false, 1500);
  }
}
