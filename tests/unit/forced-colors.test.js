/**
 * Юнит-пин критерия «цвет непрозрачен» для forced-colors e2e (задача T9.2,
 * ревью ветки: гейт границы обязан отлавливать прозрачный border-color во
 * ВСЕХ формах сериализации computed-цвета Chromium).
 *
 * Негативный кейс ревью (регрессия): комма-форма rgba — единственная, которую
 * Chromium реально выдаёт для computed border-color. Прежняя реализация
 * пропускала её целиком: isOpaque('rgba(0, 0, 0, 0)') === true — прозрачная
 * граница считалась непрозрачной, защита гейта не работала (латентно: пробы
 * стендов давали честные rgb(0, 0, 0)).
 */
import { describe, expect, it } from 'vitest';
import { isOpaqueColor } from '../../tests/helpers/forced-colors.js';

describe('forced-colors: критерий «цвет непрозрачен» (isOpaqueColor)', () => {
  it('НЕГАТИВНЫЙ КЕЙС ревью: комма-форма rgba(0, 0, 0, 0) — прозрачна', () => {
    expect(isOpaqueColor('rgba(0, 0, 0, 0)')).toBe(false);
  });

  it('комма-форма с альфой: rgba(0, 0, 0, 0.5) — непрозрачна', () => {
    expect(isOpaqueColor('rgba(0, 0, 0, 0.5)')).toBe(true);
  });

  it('rgb без альфы непрозрачен, даже если каналы нулевые (rgb(0, 0, 0))', () => {
    expect(isOpaqueColor('rgb(0, 0, 0)')).toBe(true);
  });

  it('слэш-форма: rgb(0 0 0 / 0) — прозрачна, rgb(0 0 0 / 0.5) — непрозрачна', () => {
    expect(isOpaqueColor('rgb(0 0 0 / 0)')).toBe(false);
    expect(isOpaqueColor('rgb(0 0 0 / 0.5)')).toBe(true);
  });

  it('ключевое слово transparent — прозрачно; системный цвет (CanvasText) — непрозрачен', () => {
    expect(isOpaqueColor('transparent')).toBe(false);
    expect(isOpaqueColor('CanvasText')).toBe(true);
  });

  it('белый rgb(255, 255, 255) — непрозрачен (позитивный контроль)', () => {
    expect(isOpaqueColor('rgb(255, 255, 255)')).toBe(true);
  });
});
