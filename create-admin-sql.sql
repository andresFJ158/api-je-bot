-- Script SQL para crear un usuario administrador
-- IMPORTANTE: Necesitas generar el hash de bcrypt primero
-- Usa este comando en Node.js para generar el hash:
-- node -e "const bcrypt = require('bcrypt'); bcrypt.hash('tu_password', 10).then(h => console.log(h));"

-- Reemplaza los valores:
-- - 'admin@tudominio.com' con tu email
-- - 'TU_HASH_AQUI' con el hash generado por bcrypt
-- - 'Administrador' con el nombre que quieras

INSERT INTO agents (id, email, password, name, role, "online", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'admin@tudominio.com',
  'TU_HASH_AQUI', -- Genera esto con: node -e "require('bcrypt').hash('tu_password', 10).then(h => console.log(h))"
  'Administrador',
  'admin',
  false,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Verificar que se creó correctamente
SELECT id, email, name, role FROM agents WHERE email = 'admin@tudominio.com';

