import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HogeComponent } from './hoge.component';

describe('HogeComponent', () => {
  let component: HogeComponent;
  let fixture: ComponentFixture<HogeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [HogeComponent]
    });
    fixture = TestBed.createComponent(HogeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
