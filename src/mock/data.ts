/** In-memory seed data for the mock backend (brand-neutral Acme Corp sample). */

export interface Row {
  id: string
  [key: string]: any
}

const now = '2026-06-20T09:00:00Z'

export const seed: Record<string, Row[]> = {
  brand: [
    { id: 'b1', name: 'ALFA ROMEO', logoUrl: null, createdAt: now },
    { id: 'b2', name: 'AUDI', logoUrl: null, createdAt: now },
    { id: 'b3', name: 'BMW', logoUrl: null, createdAt: now },
    { id: 'b4', name: 'FIAT', logoUrl: null, createdAt: now },
    { id: 'b5', name: 'JEEP', logoUrl: null, createdAt: now }
  ],
  vehicle: [
    {
      id: 'v1', status: 'published', visible: true, featured: true, importance: 99, brandId: 'b3',
      name: 'BMW X3', trimLevel: 'xDrive 20d Msport', tag: 'USATO COME NUOVO',
      description: '<p>SUV premium, pronta consegna.</p>',
      engine: 'diesel', category: 'suv_crossover', gearbox: 'automatic', doors: 5, seats: 5,
      optional: 'Navigatore, Cerchi 19"', svcKasko: true, svcMaintenance: true, svcRca: true, svcRoadside: true,
      monthlyVatExcl: 520, months: 48, km: 15000, readyDelivery: true,
      images: [
        { id: 'i1a', url: 'https://picsum.photos/seed/x3a/320/200', position: 0, altView: 'front' },
        { id: 'i1b', url: 'https://picsum.photos/seed/x3b/320/200', position: 1, altView: 'side' },
        { id: 'i1c', url: 'https://picsum.photos/seed/x3c/320/200', position: 2, altView: 'interior' }
      ],
      coverUrl: 'https://picsum.photos/seed/x3a/320/200', createdAt: now, updatedAt: now
    },
    {
      id: 'v2', status: 'published', visible: true, featured: false, importance: 90, brandId: 'b2',
      name: 'AUDI Q3', trimLevel: 'TDI 110 kW S tronic Business', tag: null,
      description: '<p>Compatta elegante.</p>',
      engine: 'diesel', category: 'suv_crossover', gearbox: 'automatic', doors: 5, seats: 5,
      optional: 'Fari LED Matrix', svcKasko: true, svcMaintenance: true, svcRca: true, svcRoadside: false,
      monthlyVatExcl: 458, months: 48, km: 15000, readyDelivery: false,
      images: [
        { id: 'i2a', url: 'https://picsum.photos/seed/q3a/320/200', position: 0, altView: 'front' },
        { id: 'i2b', url: 'https://picsum.photos/seed/q3b/320/200', position: 1, altView: 'rear' }
      ],
      coverUrl: 'https://picsum.photos/seed/q3a/320/200', createdAt: now, updatedAt: now
    },
    {
      id: 'v3', status: 'draft', visible: false, featured: false, importance: 50, brandId: 'b4',
      name: 'FIAT PANDA', trimLevel: '1.0 Hybrid', tag: 'CITYCAR',
      description: '<p>Perfetta per la città.</p>',
      engine: 'hybrid', category: 'city_car', gearbox: 'manual', doors: 5, seats: 5,
      optional: 'Climatizzatore', svcKasko: false, svcMaintenance: true, svcRca: true, svcRoadside: true,
      monthlyVatExcl: 199, months: 36, km: 10000, readyDelivery: true,
      images: [], coverUrl: null, createdAt: now, updatedAt: now
    },
    {
      id: 'v4', status: 'published', visible: true, featured: true, importance: 80, brandId: 'b5',
      name: 'JEEP RENEGADE', trimLevel: '1.5 T4 e-Hybrid', tag: null,
      description: '<p>Carattere e versatilità.</p>',
      engine: 'hybrid', category: 'suv_crossover', gearbox: 'automatic', doors: 5, seats: 5,
      optional: 'Tetto panoramico', svcKasko: true, svcMaintenance: true, svcRca: true, svcRoadside: true,
      monthlyVatExcl: 389, months: 48, km: 20000, readyDelivery: true,
      images: [{ id: 'i4', url: 'https://picsum.photos/seed/renegade/320/200', position: 0, altView: 'front' }],
      coverUrl: 'https://picsum.photos/seed/renegade/320/200', createdAt: now, updatedAt: now
    },
    {
      id: 'v5', status: 'archived', visible: false, featured: false, importance: 20, brandId: 'b1',
      name: 'ALFA ROMEO GIULIA', trimLevel: '2.2 Turbodiesel Veloce', tag: null,
      description: '<p>Sportiva italiana.</p>',
      engine: 'diesel', category: 'sedan', gearbox: 'automatic', doors: 5, seats: 5,
      optional: 'Sedili sportivi', svcKasko: true, svcMaintenance: false, svcRca: true, svcRoadside: false,
      monthlyVatExcl: 610, months: 36, km: 15000, readyDelivery: false,
      images: [], coverUrl: null, createdAt: now, updatedAt: now
    }
  ],
  user: [
    {
      id: 'u1', firstName: 'Admin', lastName: 'Acme', email: 'admin@acme.example',
      username: 'admin', role: 'admin', blocked: false, createdAt: now
    },
    {
      id: 'u2', firstName: 'Laura', lastName: 'Verdi', email: 'laura@acme.example',
      username: 'laura', role: 'admin', blocked: false, createdAt: now
    },
    {
      id: 'u3', firstName: 'Marco', lastName: 'Bianchi', email: 'marco@acme.example',
      username: 'marco', role: 'editor', blocked: false, createdAt: now
    }
  ],
  newsletter: [
    { id: 'n1', email: 'alice@example.com', subscribedAt: '2026-06-14T16:07:04Z', privacyAccepted: true },
    { id: 'n2', email: 'bob@example.com', subscribedAt: '2026-06-12T10:22:00Z', privacyAccepted: true },
    { id: 'n3', email: 'carol@example.com', subscribedAt: '2026-06-10T08:00:00Z', privacyAccepted: true },
    { id: 'n4', email: 'dave@example.com', subscribedAt: '2026-06-01T14:30:00Z', privacyAccepted: true }
  ],
  company: [
    {
      id: 'singleton',
      legalName: 'Acme Corp',
      vatNumber: '01234567890',
      taxCode: '',
      address: '1 Example Avenue',
      city: 'Metropolis',
      province: 'MP',
      zip: '00100',
      phone: '+39 06 1234567',
      email: 'sales@acme.example',
      website: 'https://acme.example',
      facebook: '',
      instagram: '',
      linkedin: '',
      createdAt: now,
      updatedAt: now
    }
  ]
}

export const mockTenants = [
  { id: 't1', name: 'Acme HQ' },
  { id: 't2', name: 'Acme West' }
]
