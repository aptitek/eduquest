import { describe, expect, it } from 'vitest';
import { normalizeInstitutionalEmailInput } from './auth';

describe('normalizeInstitutionalEmailInput', () => {
  it('converts blank institutional emails to null instead of empty strings', () => {
    expect(normalizeInstitutionalEmailInput('', 'ecole-ipssi.net')).toEqual({
      ok: true,
      value: null,
    });
    expect(normalizeInstitutionalEmailInput('   ', 'ecole-ipssi.net')).toEqual({
      ok: true,
      value: null,
    });
  });

  it('normalizes valid school-domain addresses and collapses duplicate @domain suffixes', () => {
    expect(normalizeInstitutionalEmailInput('a.sghaier@ECOLE-IPSSI.NET', 'ecole-ipssi.net')).toEqual({
      ok: true,
      value: 'a.sghaier@ecole-ipssi.net',
    });
    expect(
      normalizeInstitutionalEmailInput(
        'j.mapenzi@ecole-ipssi.net@ecole-ipssi.net',
        'ecole-ipssi.net'
      )
    ).toEqual({
      ok: true,
      value: 'j.mapenzi@ecole-ipssi.net',
    });
  });

  it('rejects wrong domains, foreign double-@ addresses, and spaces in local part', () => {
    expect(normalizeInstitutionalEmailInput('student@gmail.com', 'ecole-ipssi.net')).toEqual({
      ok: false,
      domain: 'ecole-ipssi.net',
    });
    expect(
      normalizeInstitutionalEmailInput('student@gmail.com@ecole-ipssi.net', 'ecole-ipssi.net')
    ).toEqual({
      ok: false,
      domain: 'ecole-ipssi.net',
    });
    expect(normalizeInstitutionalEmailInput('first last@ecole-ipssi.net', 'ecole-ipssi.net')).toEqual({
      ok: false,
      domain: 'ecole-ipssi.net',
    });
  });
});
