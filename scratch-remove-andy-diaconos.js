import { storage } from './api/storage.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    console.log('--- REVISANDO Y CORRIGIENDO USUARIOS ---');
    const members = await storage.getMembers();
    
    for (const m of members) {
        if (m.name?.toLowerCase().includes('andy') || m.name?.toLowerCase().includes('serge')) {
            console.log(`Encontrado: ${m.name} | ID: ${m.id} | TemplateID: ${m.templateId}`);
            // Si está en la plantilla de Diáconos c14a4323-2572-4081-8d6b-202ab9fbf869
            if (m.templateId === 'c14a4323-2572-4081-8d6b-202ab9fbf869') {
                console.log(`Eliminando a ${m.name} (${m.id}) de la plantilla de Diáconos...`);
                await storage.deleteMember(m.id);
                console.log('Eliminado exitosamente.');
            }
        }
    }
    console.log('--- OPERACIÓN COMPLETADA ---');
}

run();
