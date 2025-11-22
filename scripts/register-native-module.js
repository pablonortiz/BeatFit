#!/usr/bin/env node

/**
 * Script para registrar el módulo nativo WorkoutNotificationService
 * en MainApplication.java después del prebuild
 */

const fs = require('fs');
const path = require('path');

const MAIN_APPLICATION_PATH = path.join(
  __dirname,
  '..',
  'android',
  'app',
  'src',
  'main',
  'java',
  'com',
  'beatfit',
  'app',
  'MainApplication.java'
);

const IMPORT_STATEMENT = 'import com.beatfit.workoutnotification.WorkoutNotificationPackage;';
const PACKAGE_STATEMENT = 'new WorkoutNotificationPackage()';

function registerModule() {
  try {
    if (!fs.existsSync(MAIN_APPLICATION_PATH)) {
      console.log('⚠️  MainApplication.java not found. Run "npx expo prebuild" first.');
      return false;
    }

    let content = fs.readFileSync(MAIN_APPLICATION_PATH, 'utf8');

    // Verificar si ya está registrado
    if (content.includes('WorkoutNotificationPackage')) {
      console.log('✅ WorkoutNotificationPackage already registered');
      return true;
    }

    // Agregar import
    if (!content.includes(IMPORT_STATEMENT)) {
      // Buscar donde agregar el import (después de otros imports de packages)
      const importRegex = /(import com\.facebook\.react\.ReactPackage;)/;
      if (importRegex.test(content)) {
        content = content.replace(
          importRegex,
          `$1\n${IMPORT_STATEMENT}`
        );
        console.log('✅ Added import statement');
      }
    }

    // Agregar package al array
    // Buscar el patrón de getPackages()
    const packagesRegex = /(return Arrays\.asList\([^)]*)/;
    if (packagesRegex.test(content)) {
      content = content.replace(
        packagesRegex,
        `$1,\n          ${PACKAGE_STATEMENT}`
      );
      console.log('✅ Added package to getPackages()');
    } else {
      // Buscar patrón alternativo con MainReactPackage
      const mainPackageRegex = /(new MainReactPackage\(\))/;
      if (mainPackageRegex.test(content)) {
        content = content.replace(
          mainPackageRegex,
          `$1,\n          ${PACKAGE_STATEMENT}`
        );
        console.log('✅ Added package to packages array');
      }
    }

    fs.writeFileSync(MAIN_APPLICATION_PATH, content, 'utf8');
    console.log('✅ Successfully registered WorkoutNotificationPackage');
    return true;
  } catch (error) {
    console.error('❌ Error registering module:', error.message);
    return false;
  }
}

if (require.main === module) {
  registerModule();
}

module.exports = { registerModule };

